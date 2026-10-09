// Comportamento compartilhado das páginas do Diário (rodapé com amostra grátis + utilidades).
(function(){
  var SB='https://rgavgdkgtyolttnervgv.supabase.co', KEY='sb_publishable_Jd2XsVl_f8fZgZ4z7A7Nzg_3ItqCgg9';
  var RE=/^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  window.DIARIO={
    emailOk:function(e){return RE.test(String(e||'').trim())&&String(e).length<=200},
    post:function(url,body){return fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json().catch(function(){return {}}).then(function(j){j._status=r.status;return j})})},
    msg:function(el,txt,tipo){el.textContent=txt;el.className='msg'+(tipo?' '+tipo:'')}
  };
  var f=document.getElementById('amostra');
  if(f){f.addEventListener('submit',function(ev){
    ev.preventDefault();var inp=f.querySelector('input'),m=f.parentNode.querySelector('.msg'),b=f.querySelector('button');
    var e=inp.value.trim().toLowerCase();
    if(!DIARIO.emailOk(e)){DIARIO.msg(m,'Informe um e-mail válido.','err');inp.focus();return}
    b.disabled=true;DIARIO.msg(m,'Enviando…');
    fetch(SB+'/rest/v1/cci_amostras',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify({email:e})})
      .then(function(r){if(!r.ok)throw 0;DIARIO.msg(m,'Pronto! A próxima edição de amostra chega em '+e+'.','ok');inp.value=''})
      .catch(function(){DIARIO.msg(m,'Não foi possível enviar agora. Tente de novo.','err')})
      .then(function(){b.disabled=false});
  })}
})();
