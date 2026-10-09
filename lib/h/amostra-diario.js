// POST { email } -> registra o pedido de amostra do Diário e avisa por e-mail a equipe.
const { emailValido, json, falha, avisar } = require('../_lib');
const SB = 'https://rgavgdkgtyolttnervgv.supabase.co', KEY = 'sb_publishable_Jd2XsVl_f8fZgZ4z7A7Nzg_3ItqCgg9';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });
    const r = await fetch(`${SB}/rest/v1/cci_amostras`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ email }),
    });
    if (!r.ok) throw Object.assign(new Error('Supabase cci_amostras ' + r.status), { status: 502 });
    await avisar(`Pedido de amostra do Diário: ${email}`, [
      ['Produto', 'Diário Imobiliário Litoral Catarinense (amostra grátis)'], ['E-mail', email],
      ['Data', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })],
    ]);
    return json(res, 200, { ok: true });
  } catch (err) { return falha(res, err); }
};
