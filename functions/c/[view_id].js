function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeJson(obj) {
  return JSON.stringify(obj)
    .replace(/<\/script>/gi, '<\\/script>')
    .replace(/<!--/g, '<\\!--');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ params, env, request }) {
  const url       = new URL(request.url);
  const editToken = url.searchParams.get('edit');

  // ── Edit mode: verify token, redirect to builder ─────────
  if (editToken) {
    const tokenHash = await sha256(editToken);
    const match = await env.DB.prepare(
      'SELECT id FROM celebrations WHERE view_id = ? AND edit_token_hash = ?'
    ).bind(params.view_id, tokenHash).first();

    if (match) {
      return Response.redirect(
        `${url.origin}/?id=${params.view_id}&edit=${encodeURIComponent(editToken)}`,
        302
      );
    }
    // Invalid token — fall through and serve the viewer normally
  }

  // ── Viewer ────────────────────────────────────────────────
  const row = await env.DB.prepare(
    'SELECT occasion, components FROM celebrations WHERE view_id = ?'
  ).bind(params.view_id).first();

  if (!row) {
    return new Response('Celebration not found.', { status: 404 });
  }

  const components = JSON.parse(row.components);
  const name      = components.recipientName?.value ?? '';
  const greeting  = components.greeting?.value      ?? '';
  const sender    = components.sender?.value        ?? '';
  const note      = components.personalNote?.value  ?? '';
  const pageTitle = [greeting, name].filter(Boolean).join(' ');

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${escapeHtml(pageTitle)}</title>
    <meta property="og:type"        content="website">
    <meta property="og:title"       content="${escapeHtml(pageTitle)}">
    <meta property="og:description" content="From ${escapeHtml(sender)}">
    <meta property="og:image"        content="${url.origin}/og/c/${params.view_id}">
    <meta property="og:image:width"  content="1200">
    <meta property="og:image:height" content="630">
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:title"       content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="From ${escapeHtml(sender)}">
    <meta name="twitter:image"       content="${url.origin}/og/c/${params.view_id}">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
    <link rel="icon" href="/assets/favicon-32.png" sizes="32x32" type="image/png">
    <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300&family=Great+Vibes&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/viewer.css">
  </head>
  <body>
    <div id="stage" aria-hidden="true"></div>
    <main>
      <p class="greeting">${escapeHtml(greeting)}</p>
      <h1 class="name">${escapeHtml(name)}</h1>
      ${note ? `<p class="note">${escapeHtml(note)}</p>` : ''}
    </main>
    ${sender ? `<footer>from ${escapeHtml(sender)}</footer>` : ''}
    <a href="/" class="viewer-create-btn">Celebrate someone →</a>
    <script>window.__C__ = ${safeJson({ viewId: params.view_id, occasion: row.occasion, components })};</script>
    <script src="/assets/js/viewer.js"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}
