import { readToken, songCard, json, countFinish } from "../_lib/game.js";

// GiveUp・上限到達時に答えを返す
export async function onRequestPost({ request, env }){
  const body = await request.json().catch(()=>({}));
  const song = await readToken(body.token, env.GAME_SECRET);
  if(!song) return json({error:"bad_token"}, 400);
  await countFinish(env, body.token);   // GiveUp・15問でゲームオーバー
  return json({ song: songCard(song) });
}
