import { MODEL, parseJudge, unanswerableReason, readToken, exactGuess, titleMatches, presetAnswer, albumNoAnswer, scriptAnswer, trackAnswer, aiPrompt, songCard, json, rateLimited, AI_PER_MINUTE } from "../_lib/game.js";

// 質問を判定する。曲名だけの回答と質問例はサーバー内で判定し、それ以外はClaudeに問い合わせる
export async function onRequestPost({ request, env }){
  // 連打・大量アクセス対策（AIを使わない質問も含めた全体の上限。普通に遊ぶ分には届かない）
  if(rateLimited(request, 60, "ask")) return json({error:"rate_limited"}, 429);
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
  // 「○枚目のアルバムより前／まで／以降」などはデータから機械的に判定
  const ta = trackAnswer(q, song);
  if(ta) return json({kind:"question", answer:ta});
  const aa = albumNoAnswer(q, song);
  if(aa) return json({kind:"question", answer:aa});
  // 曲名の文字種（ひらがな・カタカナ・漢字・アルファベット・数字・記号）もデータから判定
  const sa = scriptAnswer(q, song);
  if(sa) return json({kind:"question", answer:sa});

  // 歌詞の質問はデータが無く判定できないので、AIに送らず「わからない」（回数に数えない）
  const why = unanswerableReason(q);
  if(why) return json({kind:"unknown", answer:"わからない", comment:why});

  // 3) 自由入力（Claude）。読み取れない返答だったときは1回だけやり直す
  if(!env.ANTHROPIC_API_KEY) return json({error:"ai_unavailable"}, 503);
  // AIに問い合わせる自由入力だけを数える（質問例・曲名・サーバー側で答えられる質問は数えない）
  if(rateLimited(request, AI_PER_MINUTE, "ai")) return json({error:"ai_rate_limited"}, 429);
  let r = null, detail = "";
  for(let attempt=0; attempt<2 && !r; attempt++){
    try{
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{ "x-api-key":env.ANTHROPIC_API_KEY, "anthropic-version":"2023-06-01", "content-type":"application/json" },
        body: JSON.stringify({ model: env.MODEL || MODEL, max_tokens: 400, messages:[{role:"user", content: aiPrompt(q, song)}] })
      });
      if(!res.ok){
        detail = `status ${res.status}`;
        if(res.status===429) return json({error:"rate_limited", detail}, 502);
        if(res.status>=400 && res.status<500) break;   // 設定ミスなどはやり直しても同じ
        continue;
      }
      const data = await res.json();
      const text = (data.content||[]).map(c=>c.text||"").join("");
      r = parseJudge(text);
      if(!r) detail = `unparsable (${data.stop_reason||"?"})`;   // 返答本文は答えが混ざる恐れがあるので返さない
    }catch(e){ detail = String(e).slice(0,80); }
  }
  if(!r) return json({error:"upstream", detail}, 502);

  const type = String(r.type||"");
  const answer = ["はい","いいえ","わからない"].includes(r.answer) ? r.answer : "わからない";
  // AIの補足コメントは曲名などの手がかりが混ざることがあるため、画面には一切出さない
  const comment = "";
  if(type === "invalid") return json({kind:"invalid"});
  if(type === "guess"){
    return titleMatches(r.guessed_title||"", song) ? json({kind:"hit", answer:"正解！", song:songCard(song)}) : json({kind:"guess", answer:"いいえ"});
  }
  return json({kind: answer==="わからない" ? "unknown" : "question", answer, comment});
}
