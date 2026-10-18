// Cloudflare Workers の入口。/api/* はゲームの判定、それ以外は public/ の画面を返す。
import * as apiNew from "../functions/api/new.js";
import * as apiAsk from "../functions/api/ask.js";
import * as apiReveal from "../functions/api/reveal.js";
import * as apiTitles from "../functions/api/titles.js";

const routes = {
  "POST /api/new": apiNew.onRequestPost,
  "POST /api/ask": apiAsk.onRequestPost,
  "POST /api/reveal": apiReveal.onRequestPost,
  "GET /api/titles": apiTitles.onRequestGet,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const handler = routes[`${request.method} ${url.pathname}`];
      if (!handler) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { "content-type": "application/json" } });
      return handler({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },
};
