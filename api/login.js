// POST { email, codigo } -> confere o código do comprador e abre a sessão. POST { sair: true } encerra.
const { rpc, emailValido, json, falha, assinarSessao, cookieSessao } = require('./_lib');

const tentativas = new Map();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  const b = req.body || {};
  if (b.sair) { res.setHeader('Set-Cookie', cookieSessao('', 0)); return json(res, 200, { ok: true }); }
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0];
  const t = tentativas.get(ip) || { n: 0, ate: 0 };
  if (t.ate > Date.now()) return json(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
  try {
    const email = String(b.email || '').trim().toLowerCase();
    const codigo = String(b.codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!emailValido(email) || codigo.length < 6) return json(res, 400, { erro: 'Informe o e-mail da compra e o código de acesso.' });
    const r = await rpc('cci_login', { p_email: email, p_codigo: codigo });
    if (!r || !r.ok) {
      t.n += 1; if (t.n >= 8) { t.ate = Date.now() + 10 * 60 * 1000; t.n = 0; }
      tentativas.set(ip, t);
      return json(res, 401, { erro: 'E-mail ou código não conferem.' });
    }
    tentativas.delete(ip);
    res.setHeader('Set-Cookie', cookieSessao(assinarSessao(email), 60 * 60 * 24 * 60));
    return json(res, 200, { ok: true, acessos: r.acessos });
  } catch (err) { return falha(res, err); }
};
