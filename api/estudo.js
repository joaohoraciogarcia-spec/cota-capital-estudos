// GET /acesso/<estudo> -> entrega o estudo para quem tem acesso válido; senão mostra compra/login.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { ESTUDOS, PRECO_ESTUDO, PRECO_RENOVACAO, DIAS_ACESSO, PIX, rpc, lerSessao, chaveDerivada, crypto } = require('./_lib');

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const data = d => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

function abrirEstudo(slug) {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'private', 'estudos', `${slug}.enc`));
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
<link rel="stylesheet" href="/diario/diario.css">
<style>.duo{display:grid;grid-template-columns:1.1fr .9fr;gap:20px;align-items:start}.alt{background:var(--card2);border:1px solid var(--line);border-radius:22px;padding:28px}.alt h2{font-size:24px}.alt p{color:var(--ink2);line-height:1.55;margin:0 0 18px}.sp{height:12px}.help{margin-top:16px;font-size:14px;color:var(--mut)}.help a{color:var(--ink2)}@media(max-width:860px){.duo{grid-template-columns:1fr}}</style>
</head><body><div class="w">
<nav><a class="brand" href="/estudos"><span class="seal"><img src="/diario/selo.png" alt=""></span><span><b>SC Cota Capital Intelligence</b><small>Estudos de mercado imobiliário</small></span></a>
<div class="links"><a href="/estudos">Estudos</a><a href="/news">News</a><a href="/diario">Diário</a></div></nav>
<main style="padding-bottom:64px"><p class="eyebrow">Estudo de mercado · Lançamentos</p>
<h1 style="max-width:22ch">${esc(titulo)}</h1>
<p class="lede" style="margin-bottom:36px">Preços, estoque, tipologias, incorporadoras e as leituras de cada gráfico, atualizado todo mês pela SC Cota Capital Intelligence.</p>
${renovar}
<div class="duo">
<div class="offer"><p class="plan">Acesso por ${DIAS_ACESSO} dias</p>
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
</div></main>
<div class="legal" style="margin-bottom:32px"><span>SC Cota Capital Intelligence · Cota Capital</span><span>Pagamento processado pelo Mercado Pago.</span></div>
</div><script src="/diario/diario.js"></script><script>
(function(){var $=function(i){return document.getElementById(i)};
$('fc').addEventListener('submit',function(e){e.preventDefault();var v=$('ce').value.trim().toLowerCase();
 if(!DIARIO.emailOk(v)){DIARIO.msg($('cm'),'Informe um e-mail válido.','err');$('ce').focus();return}
 $('cb').disabled=true;$('cb').textContent='Abrindo pagamento…';
 DIARIO.post('/api/comprar',{email:v,estudo:${JSON.stringify(slug)}}).then(function(j){if(j.url){location.href=j.url;return}
  DIARIO.msg($('cm'),j.erro||'Não foi possível abrir o pagamento agora.','err');$('cb').disabled=false;$('cb').textContent='Comprar acesso'})
 .catch(function(){DIARIO.msg($('cm'),'Sem conexão. Tente novamente.','err');$('cb').disabled=false;$('cb').textContent='Comprar acesso'})});
$('fl').addEventListener('submit',function(e){e.preventDefault();var v=$('le').value.trim().toLowerCase(),c=$('lc').value.trim();
 if(!DIARIO.emailOk(v)||c.length<6){DIARIO.msg($('lm'),'Informe o e-mail da compra e o código.','err');return}
 $('lb').disabled=true;DIARIO.msg($('lm'),'Entrando…');
 DIARIO.post('/api/login',{email:v,codigo:c}).then(function(j){if(j.ok){location.reload();return}
  DIARIO.msg($('lm'),j.erro||'Não foi possível entrar.','err');$('lb').disabled=false}).catch(function(){DIARIO.msg($('lm'),'Sem conexão.','err');$('lb').disabled=false})});
})();</script></body></html>`;
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
  try {
    const email = lerSessao(req);
    let expira = null;
    if (email) expira = await rpc('cci_acesso', { p_email: email, p_estudo: slug });
    if (email && expira && new Date(expira) > new Date()) {
      let html = abrirEstudo(slug);
      if (!/<html/i.test(html)) {
        const i = html.indexOf('<div class="wrap">'); // a página do estudo é cabeçalho (title/style) + corpo a partir de .wrap
        const head = i > 0 ? html.slice(0, i) : '', body = i > 0 ? html.slice(i) : html;
        html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">' + head + '</head><body>' + body + '</body></html>';
      }
      return res.end(html.replace(/<\/body>(?![\s\S]*<\/body>)/i, barra(expira) + '</body>'));
    }
    return res.end(pagina(slug, { email, expirou: email && expira ? expira : null }));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    return res.end(pagina(slug, {}));
  }
};
