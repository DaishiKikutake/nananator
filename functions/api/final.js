import { readGame, titleMatches, songCard, json, countFinish } from "../_lib/game.js";

// 4択の答え合わせ：正誤と答えを返す
export async function onRequestPost({ request, env }){
  const body = await request.json().catch(()=>({}));
  const g = await readGame(body.token, env.GAME_SECRET);
  if(!g) return json({error:"bad_token"}, 400);
  await countFinish(env, body.token);   // スタンダードモードの4択で回答
  return json({ correct: titleMatches(String(body.choice||""), g.song), song: songCard(g.song) });
}
