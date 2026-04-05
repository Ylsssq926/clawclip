# ClawClip 生产部署说明

## 目的与边界

本文档记录 **clawclip.luelan.online** 当前已知部署方式，便于拉代码、构建、重启与排障。

- **本文档不存放** 密码、私钥、API Token、连接串等敏感凭据；凭据仅保存在部署机与环境变量中，由维护者自行管理。
- 仓库内虽有 `Dockerfile` / `docker-compose`，**当前线上实例未使用 Docker**，以本文所述 PM2 + Node 为准。

## 当前线上实例概览

| 项 | 值 |
|----|-----|
| 对外域名 | `clawclip.luelan.online` |
| 本机监听 | `127.0.0.1:8080` |
| 进程管理 | PM2，进程名 `clawclip` |
| 运行时 | Node.js |
| 部署用户 | `ubuntu` |

## 运行架构

```
浏览器 / 客户端
    → HTTPS（域名 clawclip.luelan.online）
    → Nginx（反向代理）
    → 127.0.0.1:8080（Node 应用，PM2 托管）
```

## 服务器连接方式

维护用 SSH（请在本机 `~/.ssh/config` 中配置好别名与密钥，**勿**把密码或私钥写入仓库）：

```bash
ssh ruxi-server
```

登录后使用用户 **`ubuntu`** 进行日常操作。

## 部署路径

应用根目录：

```text
/opt/apps/services/clawclip
```

## 启动与更新流程

在部署路径下执行（按实际分支与锁文件习惯选择 `npm install` 或 `npm ci`）：

```bash
cd /opt/apps/services/clawclip
git pull
npm ci    # 或: npm install
npm run build
pm2 restart clawclip
```

首次部署或 PM2 未注册进程时，需按项目约定用 `pm2 start` 指定入口并命名为 `clawclip`（具体命令以仓库 `package.json` 与运维约定为准）。

## 健康检查

服务正常时应对 `/api/health` 返回 JSON（含 `ok`、`service` 等字段）。在服务器本机可执行：

```bash
curl -s http://127.0.0.1:8080/api/health
```

对外可通过域名验证（需与 Nginx / HTTPS 配置一致）：

```bash
curl -s https://clawclip.luelan.online/api/health
```

## 安全说明

- **禁止** 将密码、私钥、Token、数据库连接串等写入 Git、Issue 或本文档。
- SSH、Nginx、证书与 PM2 相关密钥与配置仅在服务器或密钥管理流程中维护。
- 更新依赖与 Node 版本时注意与 `package.json` / CI 要求一致，避免生产与本地行为不一致。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 监听端口 | `8080` |
| `HOST` | 监听地址 | `127.0.0.1` |
| `OPENCLAW_STATE_DIR` | OpenClaw 状态目录 | `~/.openclaw` |
| `CLAWCLIP_LOBSTER_DIRS` | 额外数据目录（冒号分隔） | - |
| `CLAWCLIP_SESSION_EXTENSIONS` | 会话文件扩展名 | `.jsonl` |
| `LOG_LEVEL` | 日志级别 | `info` |

## 故障排查

### 服务启动失败
1. 检查 Node.js 版本：`node -v`（需要 ≥ 18）
2. 检查端口占用：`lsof -i :8080`
3. 查看 PM2 日志：`pm2 logs clawclip --lines 50`

### 页面空白
1. 检查构建产物：`ls web/dist/index.html`
2. 重新构建：`npm run build`

### 回滚
```bash
# 回滚到上一个版本
git log --oneline -5  # 找到目标 commit
git checkout <commit> -- server/dist/ web/dist/
pm2 restart clawclip
```
