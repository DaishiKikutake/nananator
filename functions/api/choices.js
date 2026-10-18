import { readGame, choicesFor, json } from "../_lib/game.js";

// スタンダードモードの最後の4択（選択肢だけを返し、どれが正解かは返さない）
export async function onRequestPost({ request, env }){
  const body = await request.json().catch(()=>({}));
  const g = await readGame(body.token, env.GAME_SECRET);
  if(!g) return json({error:"bad_token"}, 400);
  if(g.mode !== "standard") return json({error:"not_available"}, 400);
  return json({ choices: choicesFor(g.song, g.mode) });
}
