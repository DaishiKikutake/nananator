// Cloudflare Workers の入口。/api/* はゲームの判定、それ以外は public/ の画面を返す。
import { DurableObject } from "cloudflare:workers";
import * as apiNew from "../functions/api/new.js";
import * as apiAsk from "../functions/api/ask.js";
import * as apiReveal from "../functions/api/reveal.js";
import * as apiTitles from "../functions/api/titles.js";
import * as apiHint from "../functions/api/hint.js";
import * as apiChoices from "../functions/api/choices.js";
import * as apiFinal from "../functions/api/final.js";
import { json, rateLimited } from "../functions/_lib/game.js";

// 挑戦者数のカウンター（Durable Object。全体で1つだけ作り、ここで数を1ずつ増やす）
export class VisitCounter extends DurableObject {
  async increment() {
    const n = ((await this.ctx.storage.get("n")) || 0) + 1;
    await this.ctx.storage.put("n", n);
    return n;
  }
}

async function visit({ request, env }) {
  if (rateLimited(request, 30)) return json({ error: "rate_limited" }, 429);
  const stub = env.COUNTER.get(env.COUNTER.idFromName("global"));
  return json({ n: await stub.increment() });
}

const routes = {
  "POST /api/new": apiNew.onRequestPost,
  "POST /api/ask": apiAsk.onRequestPost,
  "POST /api/reveal": apiReveal.onRequestPost,
  "POST /api/visit": visit,
  "POST /api/hint": apiHint.onRequestPost,
  "POST /api/choices": apiChoices.onRequestPost,
  "POST /api/final": apiFinal.onRequestPost,
  "GET /api/titles": apiTitles.onRequestGet,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const handler = routes[`${request.method} ${url.pathname}`];
      if (!handler) return json({ error: "not_found" }, 404);
      return handler({ request, env, ctx });
    }
    return env.ASSETS.fetch(request);
  },
};
