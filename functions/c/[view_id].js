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

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare(
    'SELECT occasion, components FROM celebrations WHERE view_id = ?'
  ).bind(params.view_id).first();

  if (!row) {
    return new Response('Celebration not found.', { status: 404 });
  }

  const components = JSON.parse(row.components);
  const name     = components.recipientName?.value ?? '';
  const greeting = components.greeting?.value      ?? '';
  const sender   = components.sender?.value        ?? '';
  const note     = components.personalNote?.value  ?? '';
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
    <meta name="twitter:card"        content="summary">
    <meta name="twitter:title"       content="${escapeHtml(pageTitle)}">
    <meta name="twitter:description" content="From ${escapeHtml(sender)}">
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
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
    <script>window.__C__ = ${safeJson({ occasion: row.occasion, components })};</script>
    <script src="/assets/js/viewer.js"></script>
  </body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  });
}
