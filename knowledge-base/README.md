# HTP 专业知识库运行目录

正式运行文件应为：

- `knowledge_cards.jsonl`
- `sources.json`
- `manifest.json`

本目录不依赖 `references/` 中的原始 PDF。正式 V0.2 运行包由 246 张候选卡与人工审核表按完全一致的 ID 集合安全同步生成。

`scripts/syncKnowledgeReview.js` 只更新审核字段；同步前备份候选 JSONL，并校验非审核字段哈希不变。生产服务只读取本目录，不直接依赖 `references/`。
