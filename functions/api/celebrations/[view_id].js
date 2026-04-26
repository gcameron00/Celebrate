async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare(
    'SELECT view_id, occasion, components, created_at, updated_at FROM celebrations WHERE view_id = ?'
  ).bind(params.view_id).first();

  if (!row) return Response.json({ error: 'Not found' }, { status: 404 });

  return Response.json({ ...row, components: JSON.parse(row.components) });
}

export async function onRequestPatch({ params, request, env }) {
  const auth = request.headers.get('Authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const editToken = auth.slice(7);
  const tokenHash = await sha256(editToken);

  const existing = await env.DB.prepare(
    'SELECT id FROM celebrations WHERE view_id = ? AND edit_token_hash = ?'
  ).bind(params.view_id, tokenHash).first();

  if (!existing) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  await env.DB.prepare(`
    UPDATE celebrations
    SET occasion   = COALESCE(?, occasion),
        components = COALESCE(?, components),
        updated_at = datetime('now')
    WHERE view_id = ?
  `).bind(
    body.occasion?.trim() ?? null,
    body.components != null ? JSON.stringify(body.components) : null,
    params.view_id
  ).run();

  return Response.json({ ok: true });
}
