import { readToken, songCard, json } from "../_lib/game.js";

// GiveUp・上限到達時に答えを返す
export async function onRequestPost({ request, env }){
  const body = await request.json().catch(()=>({}));
  const song = await readToken(body.token, env.GAME_SECRET);
  if(!song) return json({error:"bad_token"}, 400);
  return json({ song: songCard(song) });
}
