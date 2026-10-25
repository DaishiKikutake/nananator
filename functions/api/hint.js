import { readGame, hintsFor, json, hasHints } from "../_lib/game.js";

// スタンダードモードのヒント：数えた質問数 n までに出るヒントを返す
export async function onRequestPost({ request, env }){
  const body = await request.json().catch(()=>({}));
  const g = await readGame(body.token, env.GAME_SECRET);
  if(!g) return json({error:"bad_token"}, 400);
  if(!hasHints(g.mode)) return json({hints:[]});
  const n = Math.max(0, Math.min(15, Number(body.n)||0));
  return json({ hints: hintsFor(g.song, n) });
}
