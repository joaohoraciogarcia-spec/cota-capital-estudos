// POST { email } -> cria a assinatura recorrente no Mercado Pago e devolve o link do checkout.
const { SITE, PRECO, PRODUTO, rpc, mp, emailValido, json, falha } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });

    const atual = await rpc('cci_sub_por_email', { p_email: email });
    if (Array.isArray(atual) && atual[0] && atual[0].status === 'ativo') {
      return json(res, 409, { erro: 'Este e-mail já tem uma assinatura ativa.' });
    }

    const p = await mp('POST', '/preapproval', {
      reason: PRODUTO,
      external_reference: email,
      payer_email: email,
      back_url: `${SITE}/diario/sucesso`,
      status: 'pending',
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: PRECO, currency_id: 'BRL' },
    });

    await rpc('cci_sub_pendente', { p_email: email, p_preapproval: String(p.id) });
    return json(res, 200, { url: p.init_point });
  } catch (err) { return falha(res, err); }
};
