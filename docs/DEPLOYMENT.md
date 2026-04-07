# ClawClip 自托管 / 部署说明

这份文档面向公开仓库用户，说明如何把 ClawClip 作为一个自托管的本地 Agent 诊断台跑起来。

ClawClip 的运行方式很简单：**一个 Node 进程同时提供 API 和已构建的前端静态资源**。你可以直接用 Node 运行，也可以使用仓库内提供的 `Dockerfile` 与 `docker-compose.yml`。

## 运行前提

- Node.js **18+**
- npm **9+**
- 如需容器部署：Docker / Docker Compose

## 最小启动方式

在仓库根目录执行：

```bash
npm install
npm start
```

默认会监听：

```text
http://localhost:8080
```

说明：

- 根目录的 `npm start` 会调用 `bin/clawclip.mjs`。
- 如果 `server/dist` 或 `web/dist` 不存在，**首次启动会自动先执行一次 `npm run build`**。
- 启动后同一个进程会同时提供页面和 `/api/*` 接口。

## 本地开发

### 后端开发

```bash
npm run dev:server
```

- 启动 Express 后端
- 默认端口：`8080`

### 前端开发

```bash
npm run dev:web
```

- 启动 Vite 开发服务器
- 默认端口：`3000`
- `/api` 请求会代理到 `http://localhost:8080`

开发时通常同时开两个终端：

```bash
npm run dev:server
npm run dev:web
```

如果你只启动了 `dev:server`，但还没有构建前端，访问根路径时看到的是一条后端提示文本，这是正常现象。

## 生产构建

如果你希望把构建和运行分开，推荐先显式构建：

```bash
npm install
npm run build
npm start
```

构建完成后：

- 后端产物在 `server/dist`
- 前端产物在 `web/dist`
- `npm start` 会直接启动已构建版本

## Docker / docker-compose

仓库已包含：

- `Dockerfile`
- `docker-compose.yml`

### 使用 docker compose

```bash
docker compose up --build
```

仓库内的 `docker-compose.yml` 是一个**最小示例**：

- 对外暴露 `8080`
- 默认把宿主机的 `~/.openclaw` 以只读方式挂进容器

如果你的 Agent 数据不在默认位置，或者需要挂载多个目录，请按下文的环境变量与挂载路径自行调整。

### 使用 Docker 镜像

```bash
docker build -t clawclip .
docker run --rm -p 8080:8080 \
  -v /path/to/agent-state:/data/openclaw:ro \
  -v clawclip-state:/data/clawclip-state \
  -e OPENCLAW_STATE_DIR=/data/openclaw \
  -e CLAWCLIP_STATE_DIR=/data/clawclip-state \
  clawclip
```

上面这个例子表达的是两个原则：

- **会话数据目录可以只读挂载**
- **ClawClip 自己的状态目录最好单独挂成可写卷**

## 反向代理思路

ClawClip 在生产环境里通常就是一个上游服务，例如：

```text
浏览器
  → 反向代理（Nginx / Caddy / Traefik 等）
  → ClawClip Node 服务（默认 8080）
```

建议：

- 把 `/` 和 `/api/*` 都转发到同一个 ClawClip 实例
- 保留 `/api/health`，方便做健康检查
- 如果你使用 HTTPS，证书终止通常放在反向代理层即可
- 前端静态资源与 API 由同一个进程提供，除非你明确知道自己要拆分什么，否则不需要把它们拆成两套服务

## 健康检查

服务正常时，`/api/health` 会返回类似下面的 JSON：

```json
{"ok":true,"service":"clawclip","ts":"2026-03-01T12:34:56.789Z"}
```

本机检查：

```bash
curl http://127.0.0.1:8080/api/health
```

如果你放在反向代理后，也可以直接检查自己的公开地址：

```bash
curl https://your-domain.example/api/health
```

## 常见环境变量

> 这些变量**不会被仓库自动从 `.env` 读取**；请通过你的 shell、进程管理器、容器运行参数或托管平台环境变量来设置。仓库中的 `.env.example` 只是示例说明。

| 变量 | 作用 | 说明 |
| --- | --- | --- |
| `PORT` | 服务监听端口 | 默认 `8080` |
| `LOG_LEVEL` | 日志级别 | 支持 `debug` / `info` / `warn` / `error` / `silent` |
| `OPENCLAW_STATE_DIR` | OpenClaw 官方状态目录 | 指向你的 OpenClaw 状态根目录后，ClawClip 会优先扫描该目录下的会话；未单独设置 `CLAWCLIP_PRIMARY_LOBSTER_HOME` 时，写入类操作也会优先沿用这个目录 |
| `CLAWCLIP_LOBSTER_DIRS` | 额外数据根目录 | 用于追加扫描目录；**使用逗号或分号分隔**，不要写成冒号分隔 |
| `CLAWCLIP_SESSION_EXTENSIONS` | 会话文件扩展名列表 | 默认只认 `.jsonl`；支持**逗号或分号分隔**，未写点号时会自动补成 `.ext` |
| `CLAWCLIP_PRIMARY_LOBSTER_HOME` | 主数据根目录 | 用于模板、Skill 安装等写入场景；优先级高于自动探测结果 |
| `CLAWCLIP_STATE_DIR` | ClawClip 自身状态目录 | 用于预算、排行榜、导入会话等；默认会落到“主数据根目录”下的 `cost-monitor/` |

补充说明：

- 默认扫描目录包含：`~/.openclaw`、`~/.zeroclaw`、`~/.claw`
- `CLAWCLIP_LOBSTER_DIRS` 里的每个条目应指向一个数据根目录，而不是某个单独的 `sessions` 文件
- 对 Docker 而言，环境变量填写的是**容器内路径**，所以要和你的 volume 挂载路径保持一致

## 常见故障排查

### 1) `npm start` 第一次启动比较慢

这是正常的。根目录 `npm start` 在发现 `dist` 不存在时会先自动构建一次。

如果启动失败：

```bash
node -v
npm run build
```

先确认 Node 版本满足 **18+**，再看构建报错信息。

### 2) 页面能打开，但没有读到任何会话

先检查这几件事：

- 目标目录里是否真的存在 `agents/<agent>/sessions/*.jsonl`
- 如果数据不在默认位置，是否设置了 `OPENCLAW_STATE_DIR` 或 `CLAWCLIP_LOBSTER_DIRS`
- 如果你跑在 Docker 里，宿主机目录是否已经正确挂载进容器
- 如果你的会话文件不是 `.jsonl`，是否设置了 `CLAWCLIP_SESSION_EXTENSIONS`

### 3) 只看到“虾片后端运行中。前端请执行 npm run dev:web 启动。”

这通常表示：

- 你只启动了后端开发服务；或者
- 前端构建产物 `web/dist` 还不存在

解决方式：

- 开发模式：再启动一个 `npm run dev:web`
- 生产模式：执行 `npm run build` 后再访问

### 4) Docker 容器启动了，但数据不对或状态丢失

优先检查：

- 会话目录是否挂对了位置
- `OPENCLAW_STATE_DIR` / `CLAWCLIP_LOBSTER_DIRS` 是否指向**容器内路径**
- `CLAWCLIP_STATE_DIR` 是否落在一个可写、可持久化的 volume 上

### 5) 反向代理后健康检查失败或 API 404

通常是代理配置问题：

- 确认 `/api/*` 被转发到了 ClawClip 服务
- 不要把 `/api/health` 改写成别的路径
- 确认上游端口与你设置的 `PORT` 一致

## 一句话建议

如果你只是想先把它跑起来：**直接 `npm install && npm start`。**  
如果你要长期对外提供服务：**先 `npm run build`，再放到你熟悉的反向代理或容器环境里。**
