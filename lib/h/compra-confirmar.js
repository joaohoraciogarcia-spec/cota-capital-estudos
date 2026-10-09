// GET ?payment_id=... -> página "obrigado": confere o pagamento no Mercado Pago e mostra o código de acesso.
const { mp, rpc, ESTUDOS, json, falha, assinarSessao, cookieSessao } = require('../_lib');

async function aplicarPagamento(paymentId) {
  const p = await mp('GET', `/v1/payments/${encodeURIComponent(paymentId)}`);
  // Só compras de estudo usam um UUID como referência (pagamentos de assinatura usam o e-mail).
  if (!p || !/^[0-9a-f-]{36}$/i.test(String(p.external_reference || ''))) return { status: 'desconhecido' };
  if (p.status !== 'approved') return { status: p.status === 'rejected' || p.status === 'cancelled' ? 'recusado' : 'pendente' };
  if (p.currency_id !== 'BRL') return { status: 'desconhecido' };
  const r = await rpc('cci_compra_pagar', { p_id: p.external_reference, p_payment: String(p.id), p_valor: p.transaction_amount });
  if (!r || !r.ok) return { status: 'desconhecido' };
  return { status: 'pago', ...r };
}

module.exports = async (req, res) => {
  const id = String((req.query && req.query.payment_id) || '');
  if (!/^\d{4,24}$/.test(id)) return json(res, 400, { erro: 'Pagamento não informado.' });
  try {
    const r = await aplicarPagamento(id);
    if (r.status !== 'pago') return json(res, 200, { status: r.status });
    res.setHeader('Set-Cookie', cookieSessao(assinarSessao(r.email), 60 * 60 * 24 * 60));
    return json(res, 200, { status: 'pago', email: r.email, estudo: r.estudo, titulo: ESTUDOS[r.estudo], codigo: r.codigo, expira_em: r.expira_em });
  } catch (err) { return falha(res, err); }
};
module.exports.aplicarPagamento = aplicarPagamento;
