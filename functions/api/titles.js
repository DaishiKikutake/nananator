import { SONGS, PRESETS, json } from "../_lib/game.js";

// 曲名リストと質問例（答えの情報は含まない）
export async function onRequestGet(){
  return new Response(JSON.stringify({ titles: SONGS.map(s=>s.title), presets: PRESETS.map(p=>p[0]) }),
    { headers:{ "content-type":"application/json; charset=utf-8", "cache-control":"public, max-age=600" } });
}
