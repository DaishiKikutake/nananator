import { SONGS, STANDARD_POOL, PRESETS, json, COUPLING_POOL } from "../_lib/game.js";

// 曲名リスト（モード別）と質問例（答えの情報は含まない）
export async function onRequestGet(){
  return new Response(JSON.stringify({ titles: SONGS.map(s=>s.title), standard: STANDARD_POOL.map(s=>s.title), coupling: COUPLING_POOL.map(s=>s.title), presets: PRESETS.map(p=>p[0]) }),
    { headers:{ "content-type":"application/json; charset=utf-8", "cache-control":"public, max-age=600" } });
}
