// POST { origem: 'painel' | 'simulador', nome, whatsapp, email, empresa?, detalhe? } -> registra o contato e avisa por e-mail.
const { rpc, emailValido, json, falha, avisar } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { erro: 'Use POST' });
  try {
    const b = req.body || {};
    const origem = String(b.origem || '');
    const nome = String(b.nome || '').trim(), whatsapp = String(b.whatsapp || '').trim();
    const email = String(b.email || '').trim().toLowerCase(), empresa = String(b.empresa || '').trim();
    const detalhe = String(b.detalhe || '').slice(0, 1500);
    if (!['painel', 'simulador'].includes(origem)) return json(res, 400, { erro: 'Origem inválida.' });
    if (nome.length < 2) return json(res, 400, { erro: 'Informe seu nome.' });
    if (whatsapp.replace(/\D/g, '').length < 10) return json(res, 400, { erro: 'Informe um WhatsApp com DDD.' });
    if (!emailValido(email)) return json(res, 400, { erro: 'Informe um e-mail válido.' });
    await rpc('cci_lead_site', { p_origem: origem, p_nome: nome, p_whatsapp: whatsapp, p_email: email, p_empresa: empresa, p_detalhe: detalhe });
    await avisar(origem === 'simulador' ? `Simulador de viabilidade: ${nome}${empresa ? ' (' + empresa + ')' : ''}` : `Painel do Incorporador: ${nome}`, [
      ['Origem', origem === 'simulador' ? 'Simulador de viabilidade' : 'Painel do Incorporador SC (receber todo mês)'],
      ['Nome', nome], ['WhatsApp', whatsapp], ['E-mail', email], ['Empresa', empresa || '—'],
      ...(detalhe ? [['Simulação', detalhe]] : []),
      ['Data', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })],
    ]);
    return json(res, 200, { ok: true });
  } catch (err) { return falha(res, err); }
};
