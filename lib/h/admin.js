// POST { senha, acao: 'lista' | 'cancelar' {id} | 'convidar' {email, nome?} } -> painel do Diário protegido por senha.
const { env, rpc, mp, sincronizar, iguais, json, falha, PRECO, emailValido } = require('../_lib');

const tentativas = new Map(); // freio simples contra força bruta (por instância)

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0];
  const t = tentativas.get(ip) || { n: 0, ate: 0 };
  if (t.ate > Date.now()) return json(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos.' });
  try {
    const b = req.body || {};
    if (!iguais(b.senha, env('ADMIN_PASSWORD'))) {
      t.n += 1; if (t.n >= 5) { t.ate = Date.now() + 10 * 60 * 1000; t.n = 0; }
      tentativas.set(ip, t);
      return json(res, 401, { erro: 'Senha incorreta.' });
    }
    tentativas.delete(ip);

    if (b.acao === 'convidar') {
      const email = String(b.email || '').trim().toLowerCase();
      if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });
      const r = await rpc('cci_sub_cortesia', { p_email: email, p_nome: String(b.nome || '').trim() });
      if (!r || !r.ok) return json(res, 400, { erro: (r && r.motivo) || 'Não foi possível adicionar.' });
    }

    if (b.acao === 'cancelar') {
      const lista = await rpc('cci_sub_lista', {});
      const a = lista.find(x => x.id === b.id);
      if (!a) return json(res, 404, { erro: 'Assinante não encontrado.' });
      if (a.origem === 'cortesia') {
        await rpc('cci_sub_encerrar_cortesia', { p_id: a.id });
      } else {
        if (!a.mp_preapproval_id) return json(res, 404, { erro: 'Assinatura sem registro no Mercado Pago.' });
        await mp('PUT', `/preapproval/${encodeURIComponent(a.mp_preapproval_id)}`, { status: 'cancelled' });
        await sincronizar(a.mp_preapproval_id);
      }
    }

    const lista = await rpc('cci_sub_lista', {});
    const ativos = lista.filter(x => x.status === 'ativo');
    const pagantes = ativos.filter(x => x.origem !== 'cortesia');
    const mrr = pagantes.reduce((s, x) => s + Number(x.valor == null ? PRECO : x.valor), 0);
    return json(res, 200, {
      mrr, ativos: pagantes.length, convidados: ativos.length - pagantes.length,
      cancelados: lista.filter(x => x.status === 'cancelado').length,
      pendentes: lista.filter(x => x.status === 'pendente').length,
      assinantes: lista.map(x => ({
        id: x.id, email: x.email, nome: x.nome, origem: x.origem || 'mercadopago', status: x.status, mp_preapproval_id: x.mp_preapproval_id,
        assinado_em: x.assinado_em, cancelado_em: x.cancelado_em, criado_em: x.criado_em,
      })),
    });
  } catch (err) { return falha(res, err); }
};
