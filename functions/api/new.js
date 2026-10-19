import { poolFor, makeToken, json, rateLimited } from "../_lib/game.js";

// 新しいゲームを開始：モードの出題範囲から正解をランダムに選び、暗号化したトークンだけを返す
export async function onRequestPost({ request, env }){
  if(rateLimited(request, 30, "new")) return json({error:"rate_limited"}, 429);
  const body = await request.json().catch(()=>({}));
  const mode = body.mode === "standard" ? "standard" : "master";
  const pool = poolFor(mode);
  const song = pool[Math.floor(Math.random() * pool.length)];
  return json({ token: await makeToken(song.id, env.GAME_SECRET, mode), mode });
}
