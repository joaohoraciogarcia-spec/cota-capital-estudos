// GET /api/indicadores -> índices do Painel do Incorporador SC.
// Banco Central (SGS, API pública) + CUB/SC (tabela cci_indicadores, atualizada pelo admin todo mês).
// Resposta em cache na CDN por 6 h; se uma fonte falhar, o painel mostra as demais.
const SB = 'https://rgavgdkgtyolttnervgv.supabase.co', KEY = 'sb_publishable_Jd2XsVl_f8fZgZ4z7A7Nzg_3ItqCgg9';

async function sgs(codigo, n) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados/ultimos/${n}?formato=json`, { signal: ctl.signal, headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('BCB ' + codigo + ' ' + r.status);
    const d = await r.json();
    return d.map(x => ({ data: x.data, valor: Number(String(x.valor).replace(',', '.')) })).filter(x => isFinite(x.valor));
  } finally { clearTimeout(t); }
}
const acum = l => (l.reduce((a, x) => a * (1 + x.valor / 100), 1) - 1) * 100;
const ref = d => { const [, m, a] = String(d).split('/'); return ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][Number(m) - 1] + '/' + a; };

module.exports = async (req, res) => {
  const out = { atualizado_em: new Date().toISOString(), indicadores: {} };
  const I = out.indicadores;
  const tarefas = [
    sgs(432, 1).then(l => { const x = l[l.length - 1]; I.selic = { rotulo: 'Selic', valor: x.valor, unidade: '% ao ano', referencia: x.data, fonte: 'Banco Central' }; }),
    sgs(433, 12).then(l => { const x = l[l.length - 1]; I.ipca = { rotulo: 'IPCA', valor: acum(l), unidade: '% em 12 meses', variacao_mes: x.valor, referencia: ref(x.data), fonte: 'IBGE via Banco Central' }; }),
    sgs(192, 12).then(l => { const x = l[l.length - 1]; I.incc = { rotulo: 'INCC', valor: acum(l), unidade: '% em 12 meses', variacao_mes: x.valor, referencia: ref(x.data), fonte: 'FGV via Banco Central' }; }),
    sgs(189, 12).then(l => { const x = l[l.length - 1]; I.igpm = { rotulo: 'IGP-M', valor: acum(l), unidade: '% em 12 meses', variacao_mes: x.valor, referencia: ref(x.data), fonte: 'FGV via Banco Central' }; }),
    fetch(`${SB}/rest/v1/cci_indicadores?select=codigo,rotulo,valor,unidade,variacao_mes,variacao_12m,referencia,fonte,fonte_url,atualizado_em`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
      .then(r => r.json()).then(l => { for (const x of l) I[x.codigo] = { ...x, valor: Number(x.valor) }; }),
  ];
  const r = await Promise.allSettled(tarefas);
  r.filter(x => x.status === 'rejected').forEach(x => console.error('indicadores', x.reason && x.reason.message));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400');
  return res.end(JSON.stringify(out));
};
