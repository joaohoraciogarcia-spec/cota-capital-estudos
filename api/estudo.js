// GET /acesso/<estudo> -> entrega o estudo para quem tem acesso válido; senão mostra compra/login.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { ESTUDOS, AMOSTRA_GERAL, vendavel, lerConvite, assinarSessao, cookieSessao, PRECO_ESTUDO, PRECO_RENOVACAO, DIAS_ACESSO, PIX, rpc, lerSessao, lerLead, chaveDerivada, crypto } = require('../lib/_lib');

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const data = d => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

function abrirEstudo(slug, pasta = 'estudos') {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'private', pasta, `${slug}.enc`));
  const d = crypto.createDecipheriv('aes-256-gcm', chaveDerivada('conteudo'), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return zlib.gunzipSync(Buffer.concat([d.update(buf.subarray(28)), d.final()])).toString('utf8');
}

function pagina(slug, { email, expirou }) {
  const titulo = ESTUDOS[slug];
  const wa = `https://wa.me/${PIX.whatsapp}?text=` + encodeURIComponent(
    expirou ? `Olá! Fiz o Pix de ${brl(PRECO_RENOVACAO)} para renovar o estudo ${titulo} por mais ${DIAS_ACESSO} dias. E-mail: ${email}`
            : `Olá! Preciso de ajuda com meu código de acesso ao estudo ${titulo}.`);
  const renovar = expirou ? `
<div class="offer" style="margin-bottom:24px"><p class="plan">Seu acesso expirou em ${esc(data(expirou))}</p>
<h2 style="font-size:26px">Renove por mais ${DIAS_ACESSO} dias</h2>
<p class="price"><span class="cur">R$</span><span class="val" style="font-size:52px">${PRECO_RENOVACAO.toFixed(2).replace('.', ',')}</span><span class="per">/ ${DIAS_ACESSO} dias</span></p>
<ol class="inc" style="list-style:none"><li><span>Faça um Pix de ${brl(PRECO_RENOVACAO)} para a chave (celular) <b style="color:var(--ink);white-space:nowrap">${PIX.chave}</b></span></li><li><span>Envie o comprovante pelo WhatsApp com o seu e-mail (${esc(email)})</span></li><li><span>Liberamos o acesso em seguida, no mesmo login e código</span></li></ol>
<a class="btn" href="${wa}" target="_blank" rel="noopener">Enviar comprovante no WhatsApp</a></div>` : '';
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Estudo ${esc(titulo)} · SC Cota Capital Intelligence</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#060A10">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="/diario/diario.css"><link rel="stylesheet" href="/assets/site.css">
<style>.duo{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:start}.alt{background:var(--card2);border:1px solid var(--line);border-radius:22px;padding:28px}.alt h2{font-size:24px}.alt p{color:var(--ink2);line-height:1.55;margin:0 0 18px}.sp{height:12px}.help{margin-top:16px;font-size:14px;color:var(--mut)}.help a{color:var(--ink2)}@media(max-width:860px){.duo,#amostra{grid-template-columns:1fr!important}#fa{grid-template-columns:1fr!important}}</style>
</head><body><div class="w">
<header class="cci-nav"><a class="cci-brand" href="/"><span class="cci-seal"><img src="/assets/selo.png" alt=""></span><span><b>Cota Capital Intelligence</b><small>Mercado imobiliário do sul do Brasil</small></span></a><div class="cci-links" role="navigation" aria-label="Principal"><a href="/">Início</a><a href="/estudos" aria-current="page">Estudos</a><a href="/painel">Painel SC</a><span class="cci-news"><a href="/news" class="cci-news-a"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h13v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5Zm13 4h3v9a2 2 0 0 1-4 0M7 9h7M7 12.5h7M7 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>News<em>SC</em></a><a href="/news-rs" class="cci-news-b">RS</a></span><a href="/diario" class="cci-cta">Diário</a></div></header>
<main style="padding-bottom:64px"><p class="eyebrow">Cota Capital Intelligence · Estudo de mercado</p>
<h1 style="max-width:22ch">${esc(titulo)}</h1>
<p class="lede" style="margin-bottom:36px">Preços, estoque, tipologias, incorporadoras e as leituras de cada gráfico, atualizado todo mês pela SC Cota Capital Intelligence.</p>
${renovar}
<div class="duo">
<div class="offer" id="comprar"><p class="plan">Acesso por ${DIAS_ACESSO} dias</p>
<p class="price"><span class="cur">R$</span><span class="val">${PRECO_ESTUDO.toFixed(2).replace('.', ',')}</span></p>
<p class="note">Pagamento único pelo Mercado Pago, no Pix ou cartão. Depois, renove por ${brl(PRECO_RENOVACAO)} a cada ${DIAS_ACESSO} dias, se quiser.</p>
<ul class="inc"><li>Estudo completo de ${esc(titulo)}, com todos os gráficos</li><li>Leitura "Interpretar cenário" em cada gráfico</li><li>Login próprio com e-mail e código pessoal</li></ul>
<form id="fc" novalidate><label class="fld" for="ce">Seu e-mail</label><input id="ce" type="email" autocomplete="email" placeholder="seu@email.com.br" value="${esc(email || '')}" required>
<button class="btn" id="cb" type="submit">Comprar acesso</button></form><p class="msg" id="cm" role="status" aria-live="polite"></p></div>
<div class="alt"><h2>Já comprei</h2><p>Entre com o e-mail da compra e o código de acesso que apareceu depois do pagamento.</p>
<form id="fl" novalidate><label class="fld" for="le">E-mail</label><input id="le" type="email" autocomplete="email" placeholder="seu@email.com.br" value="${esc(email || '')}" required>
<div class="sp"></div><label class="fld" for="lc">Código de acesso</label><input id="lc" type="password" autocomplete="one-time-code" placeholder="8 letras e números" required style="text-transform:uppercase;letter-spacing:.12em;font-family:var(--m)">
<button class="btn ghost" id="lb" type="submit">Entrar</button></form><p class="msg" id="lm" role="status" aria-live="polite"></p>
<p class="help">Perdeu o código? <a href="${wa}" target="_blank" rel="noopener">Fale com a gente no WhatsApp</a>.<br>Recebeu uma senha da Cota Capital? <a href="/estudos/${slug}">Acesse com a senha</a>.</p></div>
</div>
${expirou ? '' : `<section class="alt" id="amostra" style="margin-top:20px;display:grid;grid-template-columns:.9fr 1.1fr;gap:28px;align-items:center">
<div><p class="eyebrow" style="margin-bottom:12px">Amostra grátis</p><h2>Veja antes de comprar</h2><p style="margin:0">Receba a Introdução e o Panorama completos do estudo de ${esc(titulo)}, com a tabela comparativa e as principais leituras do mercado.</p></div>
<form id="fa" novalidate style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
<div><label class="fld" for="an">Nome</label><input id="an" type="text" autocomplete="name" required></div>
<div><label class="fld" for="aw">WhatsApp</label><input id="aw" type="tel" autocomplete="tel" inputmode="tel" placeholder="(47) 99999-9999" required></div>
<div><label class="fld" for="ae">E-mail</label><input id="ae" type="email" autocomplete="email" value="${esc(email || '')}" required></div>
<div><label class="fld" for="ag">Empresa <span style="color:var(--mut);font-weight:400">(opcional)</span></label><input id="ag" type="text" autocomplete="organization"></div>
<div style="grid-column:1/-1"><button class="btn ghost" id="ab" type="submit" style="margin-top:4px">Ver a amostra grátis</button><p class="msg" id="am" role="status" aria-live="polite"></p></div>
</form></section>`}
</main>
<footer class="cci-foot"><div class="cci-fr"><div class="cci-fb"><b>Cota Capital Intelligence</b><span>Inteligência de mercado imobiliário do sul do Brasil.</span></div><div class="cci-fl" role="navigation" aria-label="Rodapé"><a href="/">Início</a><a href="/estudos">Estudos</a><a href="/painel">Painel do Incorporador</a><a href="/news">News SC</a><a href="/news-rs">News RS</a><a href="/diario">Diário Imobiliário</a><a href="/diario/cancelar">Cancelar assinatura</a><a href="https://cotacapitalinvestimentos.com.br">Cota Capital Investimentos</a></div></div>Inteligência: Cota Capital Investimentos · Emissão: Tis Marketing Intelligence · CNPJ 10.853.561/0001-97<br>Dados de oferta: plataformas de comercialização de imóveis; os dados pertencem aos seus titulares. Não é recomendação de investimento.</footer>
</div><script src="/diario/diario.js"></script><script>
(function(){var $=function(i){return document.getElementById(i)};
$('fc').addEventListener('submit',function(e){e.preventDefault();var v=$('ce').value.trim().toLowerCase();
 if(!DIARIO.emailOk(v)){DIARIO.msg($('cm'),'Informe um e-mail válido.','err');$('ce').focus();return}
 $('cb').disabled=true;$('cb').textContent='Abrindo pagamento…';
 DIARIO.post('/api/comprar',{email:v,estudo:${JSON.stringify(slug)}}).then(function(j){if(j.url){location.href=j.url;return}
  DIARIO.msg($('cm'),j.erro||'Não foi possível abrir o pagamento agora.','err');$('cb').disabled=false;$('cb').textContent='Comprar acesso'})
 .catch(function(){DIARIO.msg($('cm'),'Sem conexão. Tente novamente.','err');$('cb').disabled=false;$('cb').textContent='Comprar acesso'})});
var fa=$('fa');if(fa)fa.addEventListener('submit',function(e){e.preventDefault();
 var b={estudo:${JSON.stringify(slug)},nome:$('an').value.trim(),whatsapp:$('aw').value.trim(),email:$('ae').value.trim().toLowerCase(),empresa:$('ag').value.trim()};
 if(b.nome.length<2){DIARIO.msg($('am'),'Informe seu nome.','err');$('an').focus();return}
 if(b.whatsapp.replace(/\\D/g,'').length<10){DIARIO.msg($('am'),'Informe um WhatsApp com DDD.','err');$('aw').focus();return}
 if(!DIARIO.emailOk(b.email)){DIARIO.msg($('am'),'Informe um e-mail válido.','err');$('ae').focus();return}
 $('ab').disabled=true;DIARIO.msg($('am'),'Liberando…');
 DIARIO.post('/api/amostra',b).then(function(j){if(j.url){location.href=j.url;return}DIARIO.msg($('am'),j.erro||'Não foi possível liberar agora.','err');$('ab').disabled=false})
 .catch(function(){DIARIO.msg($('am'),'Sem conexão.','err');$('ab').disabled=false})});
if(location.search.indexOf('amostra=1')>-1&&fa){fa.scrollIntoView({block:'center'})}
$('fl').addEventListener('submit',function(e){e.preventDefault();var v=$('le').value.trim().toLowerCase(),c=$('lc').value.trim();
 if(!DIARIO.emailOk(v)||c.length<6){DIARIO.msg($('lm'),'Informe o e-mail da compra e o código.','err');return}
 $('lb').disabled=true;DIARIO.msg($('lm'),'Entrando…');
 DIARIO.post('/api/login',{email:v,codigo:c}).then(function(j){if(j.ok){location.reload();return}
  DIARIO.msg($('lm'),j.erro||'Não foi possível entrar.','err');$('lb').disabled=false}).catch(function(){DIARIO.msg($('lm'),'Sem conexão.','err');$('lb').disabled=false})});
})();</script></body></html>`;
}

const HEAD = (titulo) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)} · SC Cota Capital Intelligence</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#060A10">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap">
<link rel="stylesheet" href="/diario/diario.css"><link rel="stylesheet" href="/assets/site.css">`;
const NAV = `<header class="cci-nav"><a class="cci-brand" href="/"><span class="cci-seal"><img src="/assets/selo.png" alt=""></span><span><b>Cota Capital Intelligence</b><small>Mercado imobiliário do sul do Brasil</small></span></a><div class="cci-links" role="navigation" aria-label="Principal"><a href="/">Início</a><a href="/estudos" aria-current="page">Estudos</a><a href="/painel">Painel SC</a><span class="cci-news"><a href="/news" class="cci-news-a"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h13v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5Zm13 4h3v9a2 2 0 0 1-4 0M7 9h7M7 12.5h7M7 16h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>News<em>SC</em></a><a href="/news-rs" class="cci-news-b">RS</a></span><a href="/diario" class="cci-cta">Diário</a></div></header>`;

// Regiões do estudo amostra: Introdução + Panorama de cada estudo (as mesmas amostras do site), lado a lado em abas.
const REGIOES = [
  { slug: 'litoral-sc', nome: 'Itajaí a Porto Belo', cid: 'Itajaí · Balneário Camboriú · Itapema · Porto Belo', uf: 'SC' },
  { slug: 'camboriu', nome: 'Camboriú', cid: 'Camboriú', uf: 'SC' },
  { slug: 'picarras-penha-barra-velha', nome: 'Penha a Barra Velha', cid: 'Penha · Piçarras · Barra Velha', uf: 'SC' },
  { slug: 'gramado-canela', nome: 'Gramado e Canela', cid: 'Gramado · Canela', uf: 'Serra Gaúcha · RS' },
];

function paginaAmostra(expira) {
  const regs = REGIOES.map(r => {
    let h = abrirEstudo(r.slug, 'amostras');
    const tit = ((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(/<[^>]+>/g, '').trim();
    h = /<head[^>]*>/i.test(h) ? h.replace(/<head([^>]*)>/i, '<head$1><base target="_top">') : '<base target="_top">' + h;
    return Object.assign({ tit, src: h.replace(/&/g, '&amp;').replace(/"/g, '&quot;') }, r);
  });
  const wa = `https://wa.me/${PIX.whatsapp}?text=` + encodeURIComponent('Olá! Vi o estudo amostra da Cota Capital Intelligence e quero conhecer os estudos completos.');
  return HEAD('Estudo amostra · Litoral SC e Serra') + `
<style>
.tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:8px 0 16px}
.tab{display:grid;gap:6px;text-align:left;font:inherit;color:var(--ink);background:var(--card2);border:1px solid var(--line);border-radius:16px;padding:14px 16px;cursor:pointer}
.tab:hover{border-color:var(--gold)}.tab[aria-selected="true"]{border-color:var(--gold);box-shadow:inset 0 -3px 0 var(--gold)}
.tab small{font:700 10px/1.2 var(--m);letter-spacing:.12em;text-transform:uppercase;color:var(--gold)}
.tab b{font:800 18px/1.15 var(--d)}.tab span{font-size:13px;color:var(--mut)}
.tab:focus-visible,.cards a:focus-visible{outline:2px solid var(--gold);outline-offset:2px}
.frame{border:1px solid var(--line);border-radius:18px;overflow:hidden;background:#fff}
.frame iframe{display:block;width:100%;border:0;min-height:900px}
.hl{font:600 17px/1.45 var(--b);color:var(--ink2);margin:0 0 14px}
.cards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:18px}
.cards a{display:grid;gap:4px;text-decoration:none;color:var(--ink);background:var(--card2);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
.cards a:hover{border-color:var(--gold)}.cards b{font:800 16px var(--d)}.cards span{font-size:13px;color:var(--gold);font-weight:700}
.cta{margin-top:40px;background:var(--card2);border:1px solid var(--line);border-radius:22px;padding:28px}
.cta h2{font-size:26px;margin:0 0 8px}.cta p{color:var(--ink2);margin:0;max-width:66ch;line-height:1.55}
.acts{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}.acts .btn{width:auto;margin:0;padding:13px 20px}
@media (max-width:900px){.tabs,.cards{grid-template-columns:1fr 1fr}}
@media (max-width:520px){.cards{grid-template-columns:1fr}.tab{padding:12px}.tab span{display:none}.tab b{font-size:16px}}
</style></head><body><div class="w">${NAV}
<main style="padding-bottom:64px"><p class="eyebrow">Estudo amostra · convite Cota Capital Intelligence</p>
<h1 style="max-width:24ch">Litoral de Santa Catarina e Serra Gaúcha</h1>
<p class="lede" style="margin-bottom:28px">Uma amostra dos estudos mensais da Cota Capital Intelligence: a Introdução e o Panorama de quatro mercados, com preço por m², estoque, tipologias e as principais leituras de cada região. Escolha a região abaixo.</p>
<div class="tabs" role="tablist" aria-label="Regiões">${regs.map((r, i) => `<button class="tab" role="tab" id="t-${r.slug}" aria-controls="p-${r.slug}" aria-selected="${i === 0}" data-i="${i}"><small>${esc(r.uf)}</small><b>${esc(r.nome)}</b><span>${esc(r.cid)}</span></button>`).join('')}</div>
${regs.map((r, i) => `<section role="tabpanel" id="p-${r.slug}" aria-labelledby="t-${r.slug}"${i ? ' hidden' : ''}><div class="frame"><iframe title="Amostra do estudo ${esc(r.nome)}" loading="${i ? 'lazy' : 'eager'}" srcdoc="${r.src}"></iframe></div></section>`).join('\n')}
<section class="cta"><p class="eyebrow" style="margin-bottom:10px">Estudos completos</p><h2>Gostou do que viu?</h2>
<p>Cada estudo completo segue com mais capítulos: ranking de preço por m², incorporadoras ativas, tipologias, velocidade de venda e a leitura "Interpretar cenário" em cada gráfico. Atualizados todo mês.</p>
<div class="cards">${REGIOES.map(r => `<a href="/acesso/${r.slug}"><b>${esc(r.nome)}</b><span>${brl(PRECO_ESTUDO)} · ${DIAS_ACESSO} dias</span></a>`).join('')}</div>
<div class="acts"><a class="btn" href="${wa}" target="_blank" rel="noopener">Falar com a Cota Capital no WhatsApp</a><a class="btn ghost" href="/painel">Ver o Painel do Incorporador SC</a></div></section>
</main></div>
<script>(function(){var tabs=[].slice.call(document.querySelectorAll('.tab')),pan=[].slice.call(document.querySelectorAll('[role=tabpanel]'));
function fit(f){try{var d=f.contentDocument;if(d&&d.documentElement){f.style.height=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0)+'px'}}catch(e){}}
pan.forEach(function(p){var f=p.querySelector('iframe');f.addEventListener('load',function(){fit(f);setTimeout(function(){fit(f)},600)})});
function show(i,foco){tabs.forEach(function(t,j){t.setAttribute('aria-selected',j===i);t.tabIndex=j===i?0:-1;pan[j].hidden=j!==i});var f=pan[i].querySelector('iframe');fit(f);setTimeout(function(){fit(f)},300);if(foco)tabs[i].focus()}
tabs.forEach(function(t,i){t.onclick=function(){show(i);t.scrollIntoView({block:'nearest'})};t.onkeydown=function(e){if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show((i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length,true)}}});
show(0);window.addEventListener('resize',function(){pan.forEach(function(p){if(!p.hidden)fit(p.querySelector('iframe'))})});})();</script>
${barra(expira)}</body></html>`;
}

function paginaConvite() {
  const wa = `https://wa.me/${PIX.whatsapp}?text=` + encodeURIComponent('Olá! Gostaria de receber o estudo amostra da Cota Capital Intelligence.');
  return HEAD('Estudo amostra') + `</head><body><div class="w">${NAV}
<main style="padding-bottom:64px;max-width:720px"><p class="eyebrow">Estudo amostra · por convite</p>
<h1 style="max-width:22ch">Litoral de Santa Catarina e Serra Gaúcha</h1>
<p class="lede">Este estudo amostra é liberado pela Cota Capital para empresas convidadas. Abra pelo link pessoal que você recebeu. Se o link não funcionou ou expirou, fale com a gente.</p>
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:24px"><a class="btn" style="width:auto;margin:0" href="${wa}" target="_blank" rel="noopener">Pedir acesso no WhatsApp</a><a class="btn ghost" style="width:auto;margin:0" href="/estudos">Conhecer os estudos</a></div>
</main></div></body></html>`;
}

function barra(expira) {
  return `<div id="cci-acc" style="position:fixed;right:14px;bottom:14px;z-index:99999;display:flex;gap:10px;align-items:center;font:600 13px/1 system-ui,sans-serif;background:rgba(6,10,16,.92);color:#EEF1F5;border:1px solid #1F3247;border-radius:999px;padding:9px 14px;box-shadow:0 8px 24px rgba(0,0,0,.35)">Acesso até ${esc(data(expira))}<button onclick="fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{&quot;sair&quot;:true}'}).then(function(){location.reload()})" style="font:inherit;color:#E3B95C;background:none;border:0;cursor:pointer;padding:0">Sair</button></div>`;
}

module.exports = async (req, res) => {
  const slug = String((req.query && req.query.slug) || '');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!ESTUDOS[slug]) { res.statusCode = 404; return res.end('Estudo não encontrado'); }
  // Link pessoal (?k=...): entra direto, sem código. Grava a sessão e volta para o endereço limpo.
  const convite = req.query && req.query.k ? lerConvite(req.query.k, slug) : null;
  if (convite) {
    res.statusCode = 302;
    res.setHeader('Set-Cookie', cookieSessao(assinarSessao(convite), 60 * 60 * 24 * 400));
    res.setHeader('Location', `/acesso/${slug}`);
    return res.end();
  }
  try {
    const email = lerSessao(req);
    let expira = null;
    if (email) expira = await rpc('cci_acesso', { p_email: email, p_estudo: slug });
    if (email && expira && new Date(expira) > new Date()) {
      if (slug === AMOSTRA_GERAL) return res.end(paginaAmostra(expira));
      let html = abrirEstudo(slug);
      if (!/<html/i.test(html)) {
        const i = html.indexOf('<div class="wrap">'); // a página do estudo é cabeçalho (title/style) + corpo a partir de .wrap
        const head = i > 0 ? html.slice(0, i) : '', body = i > 0 ? html.slice(i) : html;
        html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">' + head + '</head><body>' + body + '</body></html>';
      }
      return res.end(html.replace(/<\/body>(?![\s\S]*<\/body>)/i, barra(expira) + '</body>'));
    }
    if (slug === AMOSTRA_GERAL) return res.end(paginaConvite());
    if (req.query && req.query.amostra && lerLead(req)) {
      const html = abrirEstudo(slug, 'amostras');
      const faixa = `<div style="position:sticky;top:0;z-index:99999;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:center;padding:10px 16px;background:#060A10;color:#EEF1F5;font:600 14px/1.3 system-ui,sans-serif">Você está vendo a amostra grátis de ${esc(ESTUDOS[slug])}<a href="/acesso/${slug}" style="color:#10161D;background:#E3B95C;text-decoration:none;padding:8px 14px;border-radius:999px;font-weight:700">Comprar o estudo completo · R$ 199,90</a></div>`;
      return res.end(html.replace(/<body([^>]*)>/i, (m) => m + faixa));
    }
    return res.end(pagina(slug, { email, expirou: email && expira ? expira : null }));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    return res.end(slug === AMOSTRA_GERAL ? paginaConvite() : pagina(slug, {}));
  }
};
