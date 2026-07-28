# アイコン新旧照合ページ

`index.html` をブラウザで開くだけ。**番号で指摘できる一覧**になっている。

- **旧** … 同梱をやめた FontAwesome 5.15.4 本体（`fa_old.min.js`）が描いたもの
- **新** … `src/faIcon.ts` に埋め込んだ SVG
- **差分** … 2つを重ねて difference 合成。**真っ黒なら一致**

## fa_old.min.js が無いとき

1.17MB あるので git には入れていない。旧同梱物そのものなので、履歴から戻せる：

```bash
git show 741389e:views/lib/fontawesome/all.min.js > test/icon-check/fa_old.min.js
```

## なぜ作ったか

FontAwesome 1.17MB の同梱をやめ、使う42種だけを SVG で持つようにした（v4.33.0）。
適用先53箇所のうち **46箇所は自動テストの無い `.ssn` エディタ**なので、
機械的な検証ができない。**目で見て番号で指摘できる形**にした。
