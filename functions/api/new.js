import { poolFor, makeToken, json, rateLimited } from "../_lib/game.js";

// Cloudflare Turnstile（人間確認）の証明をCloudflareに問い合わせて確かめる
async function humanOk(request, env, ts){
  if(!env.TURNSTILE_SECRET) return true;   // シークレット未登録のあいだは確認しない
  if(!ts) return false;
  try{
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", String(ts));
    const ip = request.headers.get("cf-connecting-ip"); if(ip) form.append("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method:"POST", body:form });
    const d = await r.json();
    const host = new URL(request.url).hostname;
    return !!(d.success && (!d.action || d.action === "new-game") && (!d.hostname || d.hostname === host));
  }catch(e){ return false; }
}

// 新しいゲームを開始：人間確認のあと、モードの出題範囲から正解をランダムに選び、暗号化したトークンだけを返す
export async function onRequestPost({ request, env }){
  if(rateLimited(request, 30, "new")) return json({error:"rate_limited"}, 429);
  const body = await request.json().catch(()=>({}));
  if(!(await humanOk(request, env, body.ts))) return json({error:"human_check"}, 403);
  const mode = body.mode === "standard" ? "standard" : "master";
  const pool = poolFor(mode);
  const song = pool[Math.floor(Math.random() * pool.length)];
  return json({ token: await makeToken(song.id, env.GAME_SECRET, mode), mode });
}
