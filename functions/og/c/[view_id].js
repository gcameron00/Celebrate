import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from './resvg.wasm';

const FONT_VIBES = 'https://cdn.jsdelivr.net/npm/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff2';
const FONT_INTER = 'https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-300-normal.woff2';

// Persists across requests within the same isolate
let wasmInit = null;

const GRADIENTS = {
  sunset:   ['#1a3a5c', '#5c1a8f', '#c94b2e', '#e8961e'],
  ocean:    ['#0a2a4a', '#0e4d6e', '#0a3a5a', '#2ab8c8'],
  forest:   ['#0a2a0a', '#1a4a1a', '#0a3a0a', '#4a8c2a'],
  midnight: ['#0d0221', '#1a0533', '#0d0221', '#4a2c8a'],
  rose:     ['#2a0a1a', '#5c1a3a', '#2a0a1a', '#c94b6a'],
};

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function nameFontSize(name) {
  const n = (name ?? '').length;
  if (n <= 6)  return 160;
  if (n <= 10) return 120;
  if (n <= 14) return 96;
  if (n <= 20) return 72;
  return 54;
}

async function cachedBytes(cache, url) {
  const req = new Request(url);
  const hit = await cache.match(req);
  if (hit) return new Uint8Array(await hit.arrayBuffer());
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  cache.put(req, new Response(buf.slice(0), {
    headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/octet-stream' },
  }));
  return new Uint8Array(buf);
}

function buildSvg(name, greeting, sender, scheme) {
  const [c1, c2, c3, c4] = GRADIENTS[scheme] ?? GRADIENTS.sunset;
  const sz      = nameFontSize(name);
  const nameY   = 450;
  const greetY  = Math.round(nameY - sz * 0.8 - 22);
  const senderY = nameY + 62;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"   stop-color="${c1}"/>
      <stop offset="33%"  stop-color="${c2}"/>
      <stop offset="67%"  stop-color="${c3}"/>
      <stop offset="100%" stop-color="${c4}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <line x1="0" y1="90" x2="1200" y2="90" stroke="#a08060" stroke-width="3" stroke-linecap="round"/>
  <polygon points="2,90 98,90 50,216"      fill="#5c35b8"/>
  <polygon points="302,90 398,90 350,216"  fill="#5c35b8"/>
  <polygon points="602,90 698,90 650,216"  fill="#5c35b8"/>
  <polygon points="902,90 998,90 950,216"  fill="#5c35b8"/>
  <polygon points="102,90 198,90 150,216"    fill="#e8961e"/>
  <polygon points="402,90 498,90 450,216"    fill="#e8961e"/>
  <polygon points="702,90 798,90 750,216"    fill="#e8961e"/>
  <polygon points="1002,90 1098,90 1050,216" fill="#e8961e"/>
  <polygon points="202,90 298,90 250,216"    fill="#d94d7a"/>
  <polygon points="502,90 598,90 550,216"    fill="#d94d7a"/>
  <polygon points="802,90 898,90 850,216"    fill="#d94d7a"/>
  <polygon points="1102,90 1198,90 1150,216" fill="#d94d7a"/>
  ${greeting ? `<text x="600" y="${greetY}" text-anchor="middle" font-family="Inter" font-size="28" fill="white" opacity="0.65" letter-spacing="7">${esc(greeting.toUpperCase())}</text>` : ''}
  <text x="600" y="${nameY}" text-anchor="middle" font-family="Great Vibes" font-size="${sz}" fill="white">${esc(name)}</text>
  ${sender ? `<text x="600" y="${senderY}" text-anchor="middle" font-family="Inter" font-size="26" fill="white" opacity="0.5">from ${esc(sender)}</text>` : ''}
  <text x="1160" y="614" text-anchor="end" font-family="Inter" font-size="20" fill="white" opacity="0.25">Celebrate</text>
</svg>`;
}

export async function onRequestGet({ params, env, request }) {
  const viewId  = params.view_id;
  const origin  = new URL(request.url).origin;
  const fallback = `${origin}/assets/og-image.png`;
  const cache   = caches.default;

  const pngKey = new Request(`https://celebrate-og/c/${viewId}`);
  const hit    = await cache.match(pngKey);
  if (hit) return hit;

  const row = await env.DB.prepare(
    'SELECT components FROM celebrations WHERE view_id = ?'
  ).bind(viewId).first();

  if (!row) return Response.redirect(fallback, 302);

  try {
    const c        = JSON.parse(row.components);
    const name     = c.recipientName?.value ?? '';
    const greeting = c.greeting?.value      ?? '';
    const sender   = c.sender?.value        ?? '';
    const scheme   = c.background?.scheme   ?? 'sunset';

    if (!wasmInit) {
      wasmInit = initWasm(resvgWasm);
    }
    await wasmInit;

    const [fontVibes, fontInter] = await Promise.all([
      cachedBytes(cache, FONT_VIBES),
      cachedBytes(cache, FONT_INTER),
    ]);

    const resvg = new Resvg(buildSvg(name || 'You', greeting, sender, scheme), {
      font: { loadSystemFonts: false, fontBuffers: [fontVibes, fontInter] },
    });
    const png = resvg.render().asPng();

    const res = new Response(png, {
      headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
    cache.put(pngKey, res.clone());
    return res;
  } catch (err) {
    console.error('OG render failed:', err);
    return Response.redirect(fallback, 302);
  }
}
