<!-- AUTO-GENERATED: do not edit directly. Source: .claude/rules/shared/01-workspace-map.md -->

# 工作区全局地图

## 身份与品牌主体
- 创始人 / 开发者：掠蓝蓝蓝
- 品牌：掠蓝
- 公司名称：武汉掠蓝智能科技有限公司
- 公司状态：OPC 一人公司筹备 / 申报中
- 行业代码：I6572
- 角色定位：产品经理 + 独立开发者，非纯技术人员

## 工作区结构
- 工作区根：`C:\Personal\Azure Glance`
- 根目录有自己的 `.git`
- `apps/` 下的各项目各自拥有独立 `.git`
- `luelan-portal/` 在工作区根目录下，也有独立 `.git`
- 旧名映射：`server-portal`（package name / deploy 脚本旧名）→ `luelan-portal/`

## 站点与源码目录映射（共享权威事实）
| 站点 | 域名 | 源码目录（相对工作区根） | 部署位置 | 类型 |
|------|------|------------------------|----------|------|
| 个人主站 | `luelan.online` | `luelan-portal/` | `/opt/apps/static/luelan-portal/dist` | 静态站 |
| 企业站 | `company.luelan.online` | `apps/luelan-company/` | `/opt/apps/static/luelan-company/dist` | 静态站 |
| 写作 Pro | `writing.luelan.online` | `apps/luelan-writing-pro/` | `/opt/apps/services/luelan-writing-pro` | PM2 服务 |
| 入戏 | `ruxi.luelan.online` | `apps/luelan-ruxi/` | `/opt/apps/services/luelan-ruxi` | PM2 服务 |
| 简历工坊 | `resume.luelan.online` | `apps/luelan-resume/` | `/opt/apps/services/luelan-resume` | PM2 服务 |
| 统一认证 | `auth.luelan.online` | `apps/luelan-auth/` | `/opt/apps/services/luelan-auth` | PM2 服务 |
| 2048猫猫 | `2048maomao.luelan.online` | `apps/luelan-2048maomao/` | `/opt/apps/services/luelan-2048maomao` | PM2 服务 |
| AI Love | `ai-love.luelan.online` | `apps/luelan-ai-love/` | `/opt/apps/services/luelan-ai-love` | PM2 服务 |
| CoPlay | `coplay.luelan.online` | `apps/luelan-coplay/` | `/opt/apps/static/luelan-coplay` | 静态站 |
| ClawClip | `clawclip.luelan.online` | `apps/luelan-Clawclip/` | `/opt/apps/services/clawclip` | PM2 服务 |

## 术语与歧义映射
- “个人站 / 个人主站 / luelan.online” → `luelan-portal/`
- “企业站 / 公司站 / company.luelan.online” → `apps/luelan-company/`
- “主站 / 官网 / 首页” 默认视为歧义词；未确认前不得自行假定是个人站还是企业站
- 若用户同时提到“站点 + 后台 / API”，必须继续拆清是前端、后台还是接口服务
- 注意：个人主站不在 `apps/` 里；企业站在 `apps/` 里；两者是不同站点

## 当前核心上线项目
- 核心上线产品：`luelan-writing-pro`、`luelan-ruxi`、`luelan-resume`
- 开源重点项目：`luelan-Clawclip`