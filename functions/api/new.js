import { SONGS, makeToken, json, rateLimited } from "../_lib/game.js";

// 新しいゲームを開始：正解をランダムに選び、暗号化したトークンだけを返す
export async function onRequestPost({ request, env }){
  if(rateLimited(request, 30)) return json({error:"rate_limited"}, 429);
  const id = Math.floor(Math.random() * SONGS.length);
  return json({ token: await makeToken(id, env.GAME_SECRET) });
}
