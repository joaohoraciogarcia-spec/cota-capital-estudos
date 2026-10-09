// Notificações do Mercado Pago (tópico "Planos e assinaturas").
// Autorizada -> assinante ativo; cancelada -> assinante cancelado.
// A assinatura é sempre relida na API do MP, então uma notificação forjada não muda status.
const { sincronizar, json, crypto, iguais } = require('./_lib');

function assinaturaOk(req, dataId) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true; // sem segredo configurado, confia na releitura via API
  const sig = String(req.headers['x-signature'] || '');
  const reqId = String(req.headers['x-request-id'] || '');
  const parts = Object.fromEntries(sig.split(',').map(s => s.trim().split('=')));
  if (!parts.ts || !parts.v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${reqId};ts:${parts.ts};`;
  const calc = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return iguais(calc, parts.v1);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 200, { ok: true });
  const q = req.query || {}, b = req.body || {};
  const tipo = String(b.type || q.type || b.topic || q.topic || '');
  const id = String((b.data && b.data.id) || q['data.id'] || q.id || '');
  if (!id || !/preapproval/.test(tipo)) return json(res, 200, { ignorado: true });
  if (!assinaturaOk(req, id)) return json(res, 401, { erro: 'assinatura inválida' });
  try {
    const r = await sincronizar(id);
    return json(res, 200, { ok: true, status: r.status });
  } catch (err) {
    console.error(err);
    return json(res, 500, { erro: 'falha ao processar' }); // MP tenta de novo
  }
};
