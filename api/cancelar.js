// POST { email } -> cancela a assinatura no Mercado Pago e inativa o registro.
const { rpc, mp, sincronizar, emailValido, json, falha } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });
    const r = await rpc('cci_sub_por_email', { p_email: email });
    const a = Array.isArray(r) ? r[0] : null;
    // Resposta igual para e-mail inexistente, para não revelar quem é assinante.
    if (!a || a.status !== 'ativo' || !a.mp_preapproval_id) return json(res, 200, { ok: true });
    await mp('PUT', `/preapproval/${encodeURIComponent(a.mp_preapproval_id)}`, { status: 'cancelled' });
    await sincronizar(a.mp_preapproval_id);
    return json(res, 200, { ok: true });
  } catch (err) { return falha(res, err); }
};
