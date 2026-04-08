<!-- AUTO-GENERATED: do not edit directly. Source: .claude/rules/shared/02-runtime-and-operations.md -->

# 运行、部署与运维公共规则

## 端口注册表（共享权威事实）
| PM2 进程名 | 端口 | 域名 |
|-----------|------|------|
| `writing-pro` | 3001 | `writing.luelan.online` |
| `2048maomao` | 3002 | `2048maomao.luelan.online` |
| `ai-love` | 3003 | `ai-love.luelan.online` |
| `ruxi` | 3004 | `ruxi.luelan.online` |
| `ruxi-admin` | 3005 | `ruxi.luelan.online/luelan` |
| `resume` | 3006 | `resume.luelan.online` |
| `ruxi-api` | 3007 | `ruxi.luelan.online/api` |
| `auth` | 3008 | `auth.luelan.online` |
| `clawclip` | 8080 | `clawclip.luelan.online` |

## 后台统一标准
- 入口：`https://<域名>/luelan`
- 账号：`luelan`
- 密码：`Weijiang1.`
- Writing Pro 例外：账号使用邮箱 `469906100@qq.com`

## 服务器
- 主服务器：`121.4.98.150`（`ssh ruxi-server`）
- 海外 / 测试服务器：`43.133.60.168`（ZeroClaw 测试）

## Playwright
- 公共目录：`C:\Users\黑受\.playwright\`
- 使用系统 Chrome，非测试框架，用于浏览器自动化

## 统一部署入口
- 统一部署脚本：`deploy/deploy.sh`
- PM2 配置权威入口：`deploy/pm2/ecosystem.config.js`

## 部署与验收底线
- 部署前必须确认：源码目录、部署目录、部署方式（静态 / PM2）、PM2 进程名与端口
- 静态站更新：构建产物与部署目录必须一一对应
- PM2 服务更新：确认进程名、端口、服务目录匹配后再重启或替换
- 构建失败时优先修构建，不要带着失败结果上线
- 线上出问题先回滚，再排查；不要在线上临时试错