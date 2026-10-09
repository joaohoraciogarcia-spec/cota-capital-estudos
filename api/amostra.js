// POST { estudo, nome, whatsapp, email, empresa? } -> registra o lead e libera a amostra grátis do estudo.
const { ESTUDOS, rpc, emailValido, json, falha, assinarLead } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const b = req.body || {};
    const estudo = String(b.estudo || '');
    const nome = String(b.nome || '').trim();
    const whatsapp = String(b.whatsapp || '').trim();
    const email = String(b.email || '').trim().toLowerCase();
    if (!ESTUDOS[estudo]) return json(res, 400, { erro: 'Estudo inválido.' });
    if (nome.length < 2) return json(res, 400, { erro: 'Informe seu nome.' });
    if (whatsapp.replace(/\D/g, '').length < 10) return json(res, 400, { erro: 'Informe um WhatsApp com DDD.' });
    if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });
    await rpc('cci_lead_amostra', { p_estudo: estudo, p_nome: nome, p_whatsapp: whatsapp, p_email: email, p_empresa: String(b.empresa || '') });
    res.setHeader('Set-Cookie', `cci_lead=${assinarLead(email)}; Path=/; Max-Age=${60 * 60 * 24 * 90}; HttpOnly; Secure; SameSite=Lax`);
    return json(res, 200, { ok: true, url: `/acesso/${estudo}?amostra=1` });
  } catch (err) { return falha(res, err); }
};
