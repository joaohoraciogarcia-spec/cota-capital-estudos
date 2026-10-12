// POST { senha, codigo, valor, variacao_mes?, variacao_12m?, referencia } -> atualiza o CUB/SC (mensal) pelo admin.
const { env, rpc, iguais, json, falha } = require('../_lib');
const CODIGOS = ['cub_sc_res', 'cub_sc_com'];
const num = v => { const n = Number(String(v == null ? '' : v).replace(/\./g, '').replace(',', '.')); return isFinite(n) ? n : null; };

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const b = req.body || {};
    if (!iguais(b.senha, env('ADMIN_PASSWORD'))) return json(res, 401, { erro: 'Senha incorreta.' });
    if (!CODIGOS.includes(b.codigo)) return json(res, 400, { erro: 'Indicador inválido.' });
    const valor = num(b.valor);
    if (!valor || valor < 500 || valor > 20000) return json(res, 400, { erro: 'Informe o valor em R$/m² (ex.: 3171,96).' });
    const ref = String(b.referencia || '').trim();
    if (!/^[a-zç]{3}\/\d{4}$/i.test(ref)) return json(res, 400, { erro: 'Informe a referência no formato set/2026.' });
    const r = await rpc('cci_indicador_set', { p_codigo: b.codigo, p_valor: valor, p_var_mes: num(b.variacao_mes), p_var_12m: num(b.variacao_12m), p_referencia: ref.toLowerCase() });
    return json(res, r && r.ok ? 200 : 400, r && r.ok ? { ok: true } : { erro: 'Não foi possível atualizar.' });
  } catch (err) { return falha(res, err); }
};
