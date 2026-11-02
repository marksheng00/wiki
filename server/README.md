# 助手后端（2.0 AI 问答）

右下角「助手」的后端。零依赖，Node 20.12 以上即可运行。它同时托管静态站点，所以本地预览从 `python3 -m http.server` 换成：

```bash
cp .env.example .env      # 填入 NVIDIA_API_KEY，.env 已在 .gitignore 里
npm start                 # 等于 node server/index.js
# 打开 http://localhost:8000/#character-recall-character-winston-smith-1910e4339629
```

key 只在服务端从环境变量 `NVIDIA_API_KEY`（或本地 `.env`）读取，不会发到浏览器；静态服务拒绝所有点开头的文件和 `server/` 目录。

## 一次提问怎么走

1. **检索**（`retrieve.js`）：先找问题里点名的词条（中英文名、名字的一部分，如「温斯顿」），追问时也带上上一问点名的词条；再用 BM25 在全部段落里找（英文按词、中文按二字切分）。最多选 7 个词条，每个取开头一段加最相关的几段，控制在一个字数预算内。
2. **编号**：选中的每个词条编为 `E1…`，每一句编为 `S1…`。模型只能写编号引用，所以出处永远是词条原句，前端可以在词条里找到并标黄。
3. **生成**（`prompt.js`、`llm.js`）：NVIDIA NIM 的 OpenAI 兼容接口，默认 `minimaxai/minimax-m3.1-flash`，流式。要求先一两句结论，再分 2 到 4 节；第一次出现的人和物带一句简介；每个说法带引用；可以有解读，但不能编造原文没有的情节。
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

见 `.env.example`：`NIM_MODEL`、`NIM_MAX_TOKENS`（含推理，默认 12000）、`PORT`、`HOST`、`RATE_LIMIT`（每 IP 每 10 分钟，默认 20）、`ALLOWED_ORIGINS`（站点和 API 不同域名时）、`TRUST_PROXY`、`SERVE_STATIC=0`（只开 API）、`ASSISTANT_LOG_RAW=1`（在服务端日志里打印模型原始输出，调试用）。

前端默认请求同域的 `/api/ask`；API 部署在别处时，在页面里设 `window.READIPEDIA_ASSISTANT_URL`。

在受限网络里（例如 Claude 云端环境）Node 的 fetch 默认不走代理，需要 `NODE_USE_ENV_PROXY=1 npm start`。

## 测试

```bash
npm test
```

覆盖流式解析（任意切分都得到同样结果、无效编号被丢弃、缺 `@end` 的块）和检索（中英文点名、引用句都是原文、追问沿用上一问的对象）。

## 已知问题

- **慢**：minimax-m3.1-flash 在 NIM 免费额度上会先推理，实测首字 50 到 160 秒，整答 90 到 180 秒。界面上会显示「正在思考」。之后可以换模型（`NIM_MODEL`）或换付费推理端点。

## 部署

仓库根目录的 `render.yaml` 可以在 Render 上一键部署：Render 控制台选 New → Blueprint，连上这个仓库，按提示填入 `NVIDIA_API_KEY`，几分钟后得到 `https://readipedia-xxxx.onrender.com` 这样的地址。免费档闲置 15 分钟会休眠，之后第一次打开要等半分钟左右。

其他能跑 Node 的平台（Railway、Fly.io、自己的服务器）同理：启动命令 `npm start`，设置 `NVIDIA_API_KEY`、`HOST=0.0.0.0`，平台会给 `PORT`。
