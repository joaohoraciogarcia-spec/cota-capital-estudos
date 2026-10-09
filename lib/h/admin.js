// POST { senha, acao: 'lista' | 'cancelar', id? } -> painel administrativo protegido por senha.
const { env, rpc, mp, sincronizar, iguais, json, falha, PRECO } = require('../_lib');

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

    if (b.acao === 'cancelar') {
      const lista = await rpc('cci_sub_lista', {});
      const a = lista.find(x => x.id === b.id);
      if (!a || !a.mp_preapproval_id) return json(res, 404, { erro: 'Assinante não encontrado.' });
      await mp('PUT', `/preapproval/${encodeURIComponent(a.mp_preapproval_id)}`, { status: 'cancelled' });
      await sincronizar(a.mp_preapproval_id);
    }

    const lista = await rpc('cci_sub_lista', {});
    const ativos = lista.filter(x => x.status === 'ativo');
    const mrr = ativos.reduce((s, x) => s + Number(x.valor || PRECO), 0);
    return json(res, 200, {
      mrr, ativos: ativos.length,
      cancelados: lista.filter(x => x.status === 'cancelado').length,
      pendentes: lista.filter(x => x.status === 'pendente').length,
      assinantes: lista.map(x => ({
        id: x.id, email: x.email, status: x.status, mp_preapproval_id: x.mp_preapproval_id,
        assinado_em: x.assinado_em, cancelado_em: x.cancelado_em, criado_em: x.criado_em,
      })),
    });
  } catch (err) { return falha(res, err); }
};
