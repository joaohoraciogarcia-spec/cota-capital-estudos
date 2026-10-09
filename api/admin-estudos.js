// POST { senha, acao, ... } -> painel de vendas dos estudos (mesma senha do admin do Diário).
// acao: 'lista' | 'renovar' {id, dias?, valor?} | 'manual' {email, estudo, valor?, dias?} | 'revogar' {id} | 'novo_codigo' {email}
const { env, rpc, iguais, json, falha, emailValido, ESTUDOS, PRECO_ESTUDO, PRECO_RENOVACAO, DIAS_ACESSO } = require('./_lib');

const tentativas = new Map();

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

    const acao = String(b.acao || 'lista');
    if (acao !== 'lista') {
      const args = { acao, p_id: b.id || null, p_email: b.email || null, p_estudo: b.estudo || null, p_valor: null, p_dias: Number(b.dias) || DIAS_ACESSO };
      if (acao === 'renovar') args.p_valor = Number(b.valor) || PRECO_RENOVACAO;
      if (acao === 'manual') {
        if (!emailValido(b.email || '') || !ESTUDOS[b.estudo]) return json(res, 400, { erro: 'Informe e-mail e estudo.' });
        args.p_valor = Number(b.valor) || PRECO_ESTUDO;
      }
      const r = await rpc('cci_compra_admin', args);
      if (!r || !r.ok) return json(res, 400, { erro: 'Não foi possível concluir a ação.' });
    }

    const d = await rpc('cci_compras_lista', {});
    const agora = Date.now(), mes = new Date(); mes.setDate(1); mes.setHours(0, 0, 0, 0);
    const pagas = d.compras.filter(c => c.status === 'pago');
    const fatMes = pagas.filter(c => c.pago_em && new Date(c.pago_em) >= mes).reduce((s, c) => s + Number(c.valor), 0)
      + d.renovacoes.filter(r => new Date(r.criado_em) >= mes).reduce((s, r) => s + Number(r.valor), 0);
    const fatTotal = pagas.reduce((s, c) => s + Number(c.valor) + Number(c.renovado || 0), 0);
    return json(res, 200, {
      estudos: ESTUDOS,
      ativos: pagas.filter(c => c.expira_em && new Date(c.expira_em).getTime() > agora).length,
      faturamento_mes: fatMes, faturamento_total: fatTotal,
      compras: d.compras.map(c => ({ id: c.id, email: c.email, estudo: c.estudo, valor: Number(c.valor), renovado: Number(c.renovado || 0),
        origem: c.origem, status: c.status, pago_em: c.pago_em, expira_em: c.expira_em, criado_em: c.criado_em, codigo: c.codigo })),
    });
  } catch (err) { return falha(res, err); }
};
