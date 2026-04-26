async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

function generateViewId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.occasion?.trim()) {
    return Response.json({ error: 'occasion is required' }, { status: 400 });
  }

  const viewId     = generateViewId();
  const editToken  = crypto.randomUUID();
  const tokenHash  = await sha256(editToken);

  await env.DB.prepare(
    'INSERT INTO celebrations (view_id, edit_token_hash, occasion, components) VALUES (?, ?, ?, ?)'
  ).bind(viewId, tokenHash, body.occasion.trim(), JSON.stringify(body.components ?? {})).run();

  return Response.json({ view_id: viewId, edit_token: editToken }, { status: 201 });
}
