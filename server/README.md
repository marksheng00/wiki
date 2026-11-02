# 助手后端（2.0 AI 问答）

右下角「助手」的后端。零依赖，Node 20.12 以上即可运行。它同时托管静态站点，所以本地预览从 `python3 -m http.server` 换成：

```bash
cp .env.example .env      # 填入 NVIDIA_API_KEY，.env 已在 .gitignore 里
npm start                 # 等于 node server/index.js
# 打开 http://localhost:8000/#character-recall-character-winston-smith-1910e4339629
```

key 只在服务端从环境变量 `NVIDIA_API_KEY`（或本地 `.env`）读取，不会发到浏览器；静态服务拒绝所有点开头的文件和 `server/` 目录。

## 一次提问怎么走

1. **检索**（`retrieve.js`、`vectors.js`）：先找问题里点名的词条（中英文名、名字的一部分，如「温斯顿」），追问时也带上上一问点名的词条；再在全部段落里做混合检索：BM25（英文按词、中文按二字切分）加向量检索（`nvidia/nemotron-3.5-embed-1b`，段落向量预先算好放在 `server/embeddings/`，每次提问只算问题本身，约 0.2 秒），两份排名用 RRF 合并。向量服务 3 秒内没返回就只用 BM25。最多选 7 个词条，每个取开头一段加最相关的几段，控制在一个字数预算内。

   换说法的问题靠向量才找得到（如「他为什么投降」找到「最终皈依」「他爱老大哥」）。14 个测试问题里，正确词条进前三：只用 BM25 是 6 个，混合检索是 10 个。改了词条正文后运行 `npm run embeddings`，只重算变了的段落；向量和正文对不上的段落会退回只用 BM25，启动日志会显示覆盖了多少段。
2. **编号**：选中的每个词条编为 `E1…`，每一句编为 `S1…`。模型只能写编号引用，所以出处永远是词条原句，前端可以在词条里找到并标黄。
3. **生成**（`prompt.js`、`llm.js`）：NVIDIA NIM 的 OpenAI 兼容接口，默认 `nvidia/nemotron-3-ultra-550b-a55b`（关闭推理），流式；主模型报错、过载或 45 秒没有任何输出时，自动换 `minimaxai/minimax-m3.1-flash` 重试一次。要求先一两句结论，再分 2 到 4 节；第一次出现的人和物带一句简介；每个说法带引用；可以有解读，但不能编造原文没有的情节。
4. **转换**（`answer.js`）：边收边转。`[S12]` 按阅读顺序重新编号成 `[1]`、`[2]`；`{E3|名字}` 换成词条 id；`@graph`、`@chain`、`@follow` 三段整块解析成数据。

## `POST /api/ask`

请求：`{ "question": "…", "lang": "zh" | "en", "history": [{ "q": "…", "a": "…" }] }`（history 最多取最近 3 轮）。

返回 `text/event-stream`，每条 `data:` 是一个 JSON：

| type | 内容 |
| --- | --- |
| `read` | `entities: [{id, name}]`，读了哪些词条 |
| `thinking` | 模型在推理，还没出字 |
| `cite` | `n, sid, entity, name, quote`：第 n 个引用对应的词条和原句 |
| `text` | 一段回答文字，引用写成 `[n]`，词条链接写成 `{@词条id|显示名}` |
| `graph` | `nodes: [{id, name, primary}]`，`edges: [{source, target, label, sid, entity, quote}]`，关系图 |
| `chain` | `steps: [{sid, entity, name, label, quote}]`，按故事顺序的事件经过 |
| `follow` | `questions: [...]`，追问建议 |
| `done` / `error` | 结束；`error` 为 `not_configured` 或 `upstream` |

`GET /api/health` 返回模型名和 key 是否已配置（不返回 key）。

## 配置

见 `.env.example`：`NIM_MODEL`、`NIM_FALLBACK_MODEL`（留空则不换）、`FIRST_TOKEN_TIMEOUT_MS`（默认 45000）、`ANSWER_TIMEOUT_MS`（默认 300000）、`NIM_MAX_TOKENS`（含推理，默认 12000）、`NIM_EMBED_MODEL`（默认 nvidia/nemotron-3.5-embed-1b，换了要重跑 `npm run embeddings`）、`EMBED_TIMEOUT_MS`（默认 3000）、`PORT`、`HOST`、`RATE_LIMIT`（每 IP 每 10 分钟，默认 20）、`ALLOWED_ORIGINS`（站点和 API 不同域名时）、`TRUST_PROXY`、`SERVE_STATIC=0`（只开 API）、`ASSISTANT_LOG_RAW=1`（在服务端日志里打印模型原始输出，调试用）。

前端默认请求同域的 `/api/ask`；API 部署在别处时，在页面里设 `window.READIPEDIA_ASSISTANT_URL`。

在受限网络里（例如 Claude 云端环境）Node 的 fetch 默认不走代理，需要 `NODE_USE_ENV_PROXY=1 npm start`。

## 测试

```bash
npm test
```

覆盖流式解析（任意切分都得到同样结果、无效编号被丢弃、缺 `@end` 的块）和检索（中英文点名、引用句都是原文、追问沿用上一问的对象）。

## 模型选择（2026-11-02 实测）

同一套检索和提示，中英文问题各测，看速度和格式是否完整（结论、分节、有效引用、关系图、事件经过、追问）。

| 模型 | 首字 | 整答 | 结果 |
| --- | --- | --- | --- |
| nvidia/nemotron-3-ultra-550b-a55b | 1 到 4 秒 | 13 到 27 秒 | 10 题 9 题格式完整，引用全部有效。**默认** |
| minimaxai/minimax-m3.1-flash | 75 到 210 秒 | 130 到 260 秒 | 质量好，链接和简介最全，但会先长时间推理。**备用** |
| google/gemma-4-31b-it | 约 170 秒 | 约 185 秒 | 完整，但排队久 |
| openai/gpt-oss-20b | 约 150 秒 | 约 170 秒 | 完整，引用偏少 |
| nvidia/nemotron-3.5-lightning-30b-a3b | 1 秒 | 1 到 10 秒 | 6 题只有 1 题完整，常答一句就停 |
| deepseek-v4.1-flash、glm-5.3-flash、step-5-preview、mistral-large-4 | | 超过 5 分钟 | 答不完 |
| yi-large、gemma-3-12b、mistral-large-2、llama-3.1-nemotron-70b、nemotron-nano-3 | | | 已下线（404） |

NIM 免费额度并发高时会返回 429，同时提问的人多了需要付费端点或自建推理。

## 部署

仓库根目录的 `render.yaml` 可以在 Render 上一键部署：Render 控制台选 New → Blueprint，连上这个仓库，按提示填入 `NVIDIA_API_KEY`，几分钟后得到 `https://readipedia-xxxx.onrender.com` 这样的地址。免费档闲置 15 分钟会休眠，之后第一次打开要等半分钟左右。

其他能跑 Node 的平台（Railway、Fly.io、自己的服务器）同理：启动命令 `npm start`，设置 `NVIDIA_API_KEY`、`HOST=0.0.0.0`，平台会给 `PORT`。
