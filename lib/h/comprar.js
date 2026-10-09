// POST { email, estudo } -> registra a compra pendente e devolve o checkout do Mercado Pago (Pix ou cartão).
const { SITE, ESTUDOS, PRECO_ESTUDO, DIAS_ACESSO, rpc, mp, emailValido, json, falha } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    const estudo = String(b.estudo || '');
    if (!ESTUDOS[estudo]) return json(res, 400, { erro: 'Estudo inválido.' });
    if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });

    const id = await rpc('cci_compra_criar', { p_email: email, p_estudo: estudo, p_valor: PRECO_ESTUDO });
    const pref = await mp('POST', '/checkout/preferences', {
      items: [{ id: estudo, title: `Estudo ${ESTUDOS[estudo]} · acesso ${DIAS_ACESSO} dias`, description: 'SC Cota Capital Intelligence',
        quantity: 1, unit_price: PRECO_ESTUDO, currency_id: 'BRL' }],
      payer: { email },
      external_reference: id,
      back_urls: { success: `${SITE}/acesso/obrigado`, pending: `${SITE}/acesso/obrigado`, failure: `${SITE}/acesso/${estudo}` },
      auto_return: 'approved',
      notification_url: `${SITE}/api/webhook-mp?origem=estudo`,
      statement_descriptor: 'COTA CAPITAL',
    });
    return json(res, 200, { url: pref.init_point });
  } catch (err) { return falha(res, err); }
};
