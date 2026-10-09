// GET ?preapproval_id=... -> chamado pela página de sucesso; garante o status mesmo se o webhook atrasar.
const { sincronizar, json, falha } = require('../_lib');

module.exports = async (req, res) => {
  const id = String((req.query && req.query.preapproval_id) || '');
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) return json(res, 400, { erro: 'Assinatura não informada.' });
  try {
    const r = await sincronizar(id);
    return json(res, 200, { status: r.status === 'authorized' ? 'ativo' : r.status });
  } catch (err) { return falha(res, err); }
};
