// Cloudflare Pages Function — handles GET/POST for tournament state
// Bound KV namespace: TOURNAMENT_KV (set in Cloudflare dashboard)

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Token',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env }) {
  try {
    const state = await env.TOURNAMENT_KV.get('state');
    return new Response(state || 'null', { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    // Simple token check — matches ADMIN_TOKEN env variable if set
    const token = request.headers.get('X-Admin-Token') || '';
    const expectedToken = env.ADMIN_TOKEN || '';
    if (expectedToken && token !== expectedToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS });
    }

    const body = await request.text();
    // Basic size guard (max 4MB — KV limit is 25MB but keep it sane)
    if (body.length > 4_000_000) {
      return new Response(JSON.stringify({ error: 'Payload too large' }), { status: 413, headers: CORS });
    }

    await env.TOURNAMENT_KV.put('state', body, { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS });
  }
}
