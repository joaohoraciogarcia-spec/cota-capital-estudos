// GET /api/assinantes  (Authorization: Bearer <EXPORT_TOKEN>)
// Lista os e-mails ATIVOS para o disparo diário. ?formato=csv devolve CSV.
const { env, rpc, iguais, json, falha } = require('../_lib');

module.exports = async (req, res) => {
  try {
    const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = auth || String((req.query && req.query.token) || '');
    if (!iguais(token, env('EXPORT_TOKEN'))) return json(res, 401, { erro: 'Token inválido.' });
    const ativos = (await rpc('cci_sub_lista', {})).filter(x => x.status === 'ativo');
    if ((req.query && req.query.formato) === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end('email,assinado_em\n' + ativos.map(x => `${x.email},${x.assinado_em || ''}`).join('\n'));
    }
    return json(res, 200, { total: ativos.length, emails: ativos.map(x => x.email) });
  } catch (err) { return falha(res, err); }
};
