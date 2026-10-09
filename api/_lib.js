// Utilidades compartilhadas pelas funções do Diário Imobiliário (arquivos com _ não viram rota).
const crypto = require('crypto');

const SUPABASE_URL = 'https://rgavgdkgtyolttnervgv.supabase.co';
const SUPABASE_ANON = 'sb_publishable_Jd2XsVl_f8fZgZ4z7A7Nzg_3ItqCgg9';
const SITE = process.env.SITE_URL || 'https://estudos.cotacapitalinvestimentos.com.br';
const PRECO = 9.9;
const PRODUTO = 'Diário Imobiliário Litoral Catarinense';

function env(name) {
  const v = process.env[name];
  if (!v) { const e = new Error(`Variável de ambiente ${name} não configurada`); e.status = 503; throw e; }
  return v;
}

async function rpc(fn, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ chave: env('CCI_SUB_KEY'), ...args }),
  });
  const t = await r.text();
  if (!r.ok) { const e = new Error(`Supabase ${fn}: ${r.status} ${t.slice(0, 200)}`); e.status = 502; throw e; }
  return t ? JSON.parse(t) : null;
}

async function mp(method, path, body) {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${env('MP_ACCESS_TOKEN')}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch (_) {}
  if (!r.ok) { const e = new Error(`Mercado Pago ${path}: ${r.status} ${(j && (j.message || j.error)) || t.slice(0, 200)}`); e.status = 502; e.mp = j; throw e; }
  return j;
}

// Busca a assinatura no Mercado Pago e grava o status no banco (fonte da verdade é sempre a API do MP).
async function sincronizar(preapprovalId) {
  const p = await mp('GET', `/preapproval/${encodeURIComponent(preapprovalId)}`);
  const email = p.external_reference || p.payer_email || '';
  const out = await rpc('cci_sub_status', {
    p_preapproval: String(p.id), p_email: email, p_payer: p.payer_id ? String(p.payer_id) : null, p_status: p.status,
  });
  return { status: p.status, email, ...out };
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function emailValido(e) { return typeof e === 'string' && e.length <= 200 && EMAIL_RE.test(e.trim()); }

function iguais(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function falha(res, err) {
  console.error(err);
  json(res, err.status || 500, { erro: err.status === 503 ? err.message : 'Não foi possível concluir agora. Tente novamente em instantes.' });
}

module.exports = { SITE, PRECO, PRODUTO, env, rpc, mp, sincronizar, emailValido, iguais, json, falha, crypto };
