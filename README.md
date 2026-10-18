# 奈々ネーター 公開手順

水樹奈々さんの楽曲当てゲームを、誰でもXのリンクから遊べるように公開するための手順です。
Cloudflare Pages（無料プラン）で公開し、自由入力の判定だけをClaude API（有料・従量課金）で行います。

## フォルダの中身

| パス | 役割 |
|---|---|
| `public/index.html` | ゲーム画面 |
| `public/ogp.png` | Xでリンクを貼ったときに表示されるカード画像 |
| `functions/api/new.js` | 新しいゲームを始める（正解を暗号化して発行） |
| `functions/api/ask.js` | 質問を判定する（曲名・質問例はサーバー内で判定、自由入力はClaudeに問い合わせ） |
| `functions/api/reveal.js` | GiveUp・15問到達時に答えを返す |
| `functions/api/titles.js` | 曲名リストと質問例を返す |
| `functions/_lib/game.js` | 楽曲データ（312曲）と判定ロジック |
| `wrangler.toml` | Cloudflareの設定 |

正解の曲はサーバー側だけが知っていて、ブラウザには暗号化した番号しか渡しません。開発者ツールを開いても答えは見えません。

## 1. Claude APIキーを用意する

1. https://platform.claude.com にアクセスしてアカウントを作成します。
2. 「Billing」でクレジットを購入します（最低額で十分です）。
3. 「API Keys」で新しいキーを作成し、表示された文字列（`sk-ant-...`）を控えます。**このキーは人に見せないでください。**
4. 「Limits」で月の利用上限（例：5ドル）を設定します。想定外のアクセスがあっても、上限を超えて請求されることはありません。

## 2. GitHubにアップロードする

1. https://github.com でアカウントを作り、「New repository」で `nananator` という名前のリポジトリを作成します（Privateでも構いません）。
2. 「uploading an existing file」から、このフォルダの中身（`public`、`functions`、`wrangler.toml`、`README.md`）をドラッグ＆ドロップしてコミットします。

## 3. Cloudflare Pagesで公開する

1. https://dash.cloudflare.com でアカウントを作成します（無料）。
2. 「Workers & Pages」→「作成」→「Pages」→「Gitに接続」で、手順2のリポジトリを選びます。
3. ビルド設定は次のとおりにします。
   - フレームワーク プリセット：なし
   - ビルドコマンド：空欄
   - ビルド出力ディレクトリ：`public`
4. 「環境変数」に次の2つを**シークレット（暗号化）**として追加します。
   - `ANTHROPIC_API_KEY`：手順1で控えたキー
   - `GAME_SECRET`：答えの暗号化に使う合言葉。30文字以上の適当な英数字（例：パスワード生成ツールで作ったもの）
5. 「保存してデプロイ」を押します。1〜2分で `https://nananator.pages.dev` のようなURLで公開されます。

### 公開URLが `nananator.pages.dev` 以外になった場合

`public/index.html` の上のほうにある次の2行の `https://nananator.pages.dev` を、実際のURLに書き換えてGitHubに再アップロードしてください。Xのカード画像が正しく表示されるようになります。

```html
<meta property="og:url" content="https://nananator.pages.dev/">
<meta property="og:image" content="https://nananator.pages.dev/ogp.png">
```

## 4. 公開後の確認

1. 公開URLをスマホで開き、質問例と自由入力の質問をそれぞれ1回ずつ送ってみます。
2. 自由入力で「今は自由入力の判定が使えません」と出る場合は、`ANTHROPIC_API_KEY` の設定を確認し、Cloudflareで「再デプロイ」してください。
3. URLをXに投稿すると、カード画像付きで表示されます。

## 5. いたずら・使いすぎ対策（おすすめ）

- **Claude側**：手順1-4の月の利用上限を必ず設定してください。
- **Cloudflare側**：「セキュリティ」→「WAF」→「レート制限ルール」で、URIパスが `/api/ask` を含むリクエストを「同じIPから10秒間に10回まで」に制限できます（無料プランで1ルール作成可能）。
- サーバー側でも、同じIPからの質問を1分間に20回までに制限しています。

## 6. 楽曲データを更新するとき

`functions/_lib/game.js` の先頭にある `RAW` の中身が楽曲データです。1行1曲で、`|` 区切りの項目は次の順番です。

```
曲名|別名(;区切り)|初出日|種別|初出作品|タイアップ|収録アルバム|備考|作詞|作曲|編曲|アルバム:曲順(;区切り)
```

種別は A=シングル表題曲、C=カップリング、L=アルバム曲、D=配信シングル、X=共演曲 です。
編集してGitHubにアップロードすると、Cloudflareが自動で再公開します。

## 使用しているAIモデル

`functions/_lib/game.js` の `MODEL`（初期値 `claude-haiku-5-5`）です。Cloudflareの環境変数 `MODEL` を設定すると上書きできます。判定の精度を上げたい場合は `claude-sonnet-5-5` にできますが、費用は約20倍になります。
