// Roteador único das rotas /api/* (o plano Hobby da Vercel limita o número de funções).
// Cada rota continua em lib/h/<nome>.js; /api/estudo tem função própria por causa dos arquivos privados.
const ROTAS = {
  'admin': require('../lib/h/admin'),
  'admin-estudos': require('../lib/h/admin-estudos'),
  'amostra': require('../lib/h/amostra'),
  'amostra-diario': require('../lib/h/amostra-diario'),
  'assinantes': require('../lib/h/assinantes'),
  'assinar': require('../lib/h/assinar'),
  'cancelar': require('../lib/h/cancelar'),
  'comprar': require('../lib/h/comprar'),
  'compra-confirmar': require('../lib/h/compra-confirmar'),
  'confirmar': require('../lib/h/confirmar'),
  'login': require('../lib/h/login'),
  'webhook-mp': require('../lib/h/webhook-mp'),
};

module.exports = async (req, res) => {
  const rota = String((req.query && req.query.rota) || '');
  const h = Object.prototype.hasOwnProperty.call(ROTAS, rota) ? ROTAS[rota] : null;
  if (!h) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end('{"erro":"rota não encontrada"}'); }
  if (req.query) delete req.query.rota;
  return h(req, res);
};
