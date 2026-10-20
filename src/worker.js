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

// 挑戦者数のカウンター（Durable Object。全体で1つだけ作る）
// 数えるのはゲームが終わったとき（正解・GiveUp・15問でゲームオーバー・4択で回答）。1ゲーム1回だけ
export class VisitCounter extends DurableObject {
  async ready() {
    // 2026-10-20：数え方を変更し、以前のカウント（ページを開いた回数）を消して0から数え直す
    if ((await this.ctx.storage.get("v")) !== 2) {
      await this.ctx.storage.deleteAll();
      await this.ctx.storage.put({ v: 2, plays: 0 });
    }
  }
  async plays() {
    await this.ready();
    return (await this.ctx.storage.get("plays")) || 0;
  }
  async finish(gameKey) {
    await this.ready();
    const k = "g:" + gameKey;
    if (await this.ctx.storage.get(k)) return (await this.ctx.storage.get("plays")) || 0;   // このゲームは数え済み
    const n = ((await this.ctx.storage.get("plays")) || 0) + 1;
    await this.ctx.storage.put({ plays: n, [k]: Date.now() });
    if (n % 200 === 0) {   // 古い記録（3日以上前）はときどき掃除する
      const old = Date.now() - 3 * 24 * 3600 * 1000;
      const list = await this.ctx.storage.list({ prefix: "g:" });
      const del = [...list].filter(([, t]) => t < old).map(([key]) => key);
      for (let i = 0; i < del.length; i += 128) await this.ctx.storage.delete(del.slice(i, i + 128));
    }
    return n;
  }
}

// ページ上部の「あなたは○人めの挑戦者です！」用：挑戦を終えた人数＋1（見るだけでは増えない）
async function visit({ request, env }) {
  if (rateLimited(request, 30, "visit")) return json({ error: "rate_limited" }, 429);
  const stub = env.COUNTER.get(env.COUNTER.idFromName("global"));
  return json({ n: (await stub.plays()) + 1 });
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
