import { MODEL, readToken, exactGuess, titleMatches, presetAnswer, aiPrompt, songCard, json, rateLimited } from "../_lib/game.js";

// 質問を判定する。曲名だけの回答と質問例はサーバー内で判定し、それ以外はClaudeに問い合わせる
export async function onRequestPost({ request, env }){
  if(rateLimited(request)) return json({error:"rate_limited"}, 429);
  const body = await request.json().catch(()=>({}));
  const q = String(body.q || "").trim().slice(0, 100);
  if(!q) return json({error:"empty"}, 400);
  const song = await readToken(body.token, env.GAME_SECRET);
  if(!song) return json({error:"bad_token"}, 400);

  // 1) 曲名だけの回答
  const gid = exactGuess(q);
  if(gid !== null){
    return gid === song.id ? json({kind:"hit", answer:"正解！", song:songCard(song)}) : json({kind:"guess", answer:"いいえ"});
  }
  // 2) 質問例
  const pa = presetAnswer(q, song);
  if(pa) return json({kind:"question", answer:pa});

  // 3) 自由入力（Claude）
  if(!env.ANTHROPIC_API_KEY) return json({error:"ai_unavailable"}, 503);
  let r;
  try{
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{ "x-api-key":env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01", "content-type":"application/json" },
      body: JSON.stringify({ model: env.MODEL || MODEL, max_tokens: 200, messages:[{role:"user", content: aiPrompt(q, song)}] })
    });
    if(!res.ok) return json({error: res.status===429 ? "rate_limited" : "upstream"}, 502);
    const data = await res.json();
    const text = (data.content||[]).map(c=>c.text||"").join("");
    const m = text.match(/\{[\s\S]*\}/);
    r = JSON.parse(m ? m[0] : text);
  }catch(e){ return json({error:"upstream"}, 502); }

  const type = String(r.type||"");
  const answer = ["はい","いいえ","わからない"].includes(r.answer) ? r.answer : "わからない";
  const comment = typeof r.comment === "string" ? r.comment.slice(0, 40) : "";
  if(type === "invalid") return json({kind:"invalid"});
  if(type === "guess"){
    return titleMatches(r.guessed_title||"", song) ? json({kind:"hit", answer:"正解！", song:songCard(song)}) : json({kind:"guess", answer:"いいえ"});
  }
  return json({kind: answer==="わからない" ? "unknown" : "question", answer, comment});
}
