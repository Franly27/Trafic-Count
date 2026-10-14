/**
 * Proxy CORS untuk CCTV Dishub Kab. Tangerang -> Traffic Counter.
 * Pasang sebagai Cloudflare Worker (gratis). Lihat README bagian "CCTV Dishub".
 *
 *   GET /cameras            -> daftar kamera [{id,name,lat,lon}] (diambil dari halaman peta)
 *   GET /v/<id>/<file>      -> /storage/video/<id>/<file> (.m3u8 / .ts) + header CORS
 *
 * Hanya path di atas yang diteruskan, jadi Worker ini tidak bisa dipakai sebagai proxy umum.
 * Opsional: isi variabel ALLOW_ORIGIN (mis. https://franly27.github.io) agar hanya
 * aplikasi Anda yang boleh memakai Worker ini.
 */
const UPSTREAM = "https://cctv-dishub.tangerangkab.go.id";

export default {
  async fetch(req, env, ctx) {
    const allow = (env && env.ALLOW_ORIGIN) || "*";
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": allow === "*" ? "*" : allow,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Range",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range",
      "Vary": "Origin",
    };
    if (allow !== "*" && origin && origin !== allow) return new Response("origin ditolak", { status: 403, headers: cors });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "GET") return new Response("hanya GET", { status: 405, headers: cors });

    const url = new URL(req.url);

    if (url.pathname === "/cameras") {
      const cache = caches.default, key = new Request(url.origin + "/cameras");
      let hit = await cache.match(key);
      if (!hit) {
        const r = await fetch(UPSTREAM + "/cctv-map", { headers: { "User-Agent": "TrafficCounter/1.0" } });
        if (!r.ok) return new Response("gagal ambil daftar kamera: " + r.status, { status: 502, headers: cors });
        const cams = parseCameras(await r.text());
        hit = new Response(JSON.stringify(cams), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
        ctx.waitUntil(cache.put(key, hit.clone()));
      }
      return new Response(hit.body, { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } });
    }

    const m = url.pathname.match(/^\/v\/([0-9a-z]{20,40})\/([\w.-]+\.(m3u8|ts))$/i);
    if (!m) return new Response("tidak ditemukan", { status: 404, headers: cors });
    const [, id, file, ext] = m;
    const isList = ext.toLowerCase() === "m3u8";
    const up = await fetch(`${UPSTREAM}/storage/video/${id}/${file}`, {
      headers: { "User-Agent": "TrafficCounter/1.0", ...(req.headers.get("Range") ? { Range: req.headers.get("Range") } : {}) },
      cf: isList ? { cacheTtl: 0 } : { cacheTtl: 60, cacheEverything: true },
    });
    const h = new Headers(cors);
    h.set("Content-Type", isList ? "application/vnd.apple.mpegurl" : "video/mp2t");
    h.set("Cache-Control", isList ? "no-store" : "public, max-age=60");
    for (const k of ["Content-Length", "Content-Range", "Accept-Ranges"]) if (up.headers.get(k)) h.set(k, up.headers.get(k));
    if (!isList) return new Response(up.body, { status: up.status, headers: h });
    // Tulis ulang URL absolut di playlist (kalau ada) supaya tetap lewat Worker.
    let text = await up.text();
    text = text.replace(new RegExp(UPSTREAM.replace(/[.]/g, "\\.") + "/storage/video/", "g"), url.origin + "/v/");
    h.delete("Content-Length");
    return new Response(text, { status: up.status, headers: h });
  },
};

function parseCameras(html) {
  const s = html.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\\\//g, "/");
  const re = /\{"id":"(\w+)","name":"((?:[^"\\]|\\.)*)","latitude":(-?[\d.]+),"longitude":(-?[\d.]+)/g;
  const out = new Map();
  for (const x of s.matchAll(re)) {
    let name = x[2];
    try { name = JSON.parse('"' + name + '"'); } catch (e) {}
    out.set(x[1], { id: x[1], name: name.trim(), lat: +x[3], lon: +x[4] });
  }
  return [...out.values()];
}
