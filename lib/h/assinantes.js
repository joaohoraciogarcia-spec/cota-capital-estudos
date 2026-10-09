// API do disparo diário (usada pelo agente do Base44). Autenticação: Authorization: Bearer <EXPORT_TOKEN>.
//   GET  /api/assinantes                  -> e-mails ATIVOS do Diário  { total, emails }
//   GET  /api/assinantes?formato=csv      -> mesma lista em CSV
//   GET  /api/assinantes?lista=amostras   -> pedidos de amostra ainda não atendidos { total, emails }
//   POST /api/assinantes { acao: "marcar_amostras", emails: [...] } -> marca as amostras como enviadas
const { env, rpc, iguais, json, falha, emailValido } = require('../_lib');

module.exports = async (req, res) => {
  try {
    const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const token = auth || String((req.query && req.query.token) || '');
    if (!iguais(token, env('EXPORT_TOKEN'))) return json(res, 401, { erro: 'Token inválido.' });
    const q = req.query || {};

    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.acao !== 'marcar_amostras' || !Array.isArray(b.emails)) return json(res, 400, { erro: 'Envie { acao: "marcar_amostras", emails: [...] }.' });
      const emails = b.emails.map(e => String(e).trim().toLowerCase()).filter(emailValido).slice(0, 1000);
      const r = await rpc('cci_amostras_marcar', { p_emails: emails });
      return json(res, 200, r);
    }

    if (q.lista === 'amostras') {
      const l = await rpc('cci_amostras_pendentes', {});
      return json(res, 200, { total: l.length, emails: l.map(x => x.email), pedidos: l });
    }

    const ativos = (await rpc('cci_sub_lista', {})).filter(x => x.status === 'ativo');
    if (q.formato === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.end('email,assinado_em\n' + ativos.map(x => `${x.email},${x.assinado_em || ''}`).join('\n'));
    }
    return json(res, 200, { total: ativos.length, emails: ativos.map(x => x.email), cancelar_url: 'https://estudos.cotacapitalinvestimentos.com.br/diario/cancelar' });
  } catch (err) { return falha(res, err); }
};
