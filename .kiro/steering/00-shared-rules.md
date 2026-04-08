<!-- AUTO-GENERATED: do not edit directly. Source: workspace shared rules -->

# 共享规则

## 01-workspace-map

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

## 02-runtime-and-operations

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

## 03-subagents-and-quality

# 子代理、提示词与质量规则

## 总原则
- 子代理是执行器，不是替你猜需求的人
- 先把上下文写足，再把任务派清楚
- 质量优先，不计较 token 成本；复杂任务默认可以注入大量上下文
- 如果结果有不确定性，优先通过补上下文、补限制、补验收标准解决，不要让用户兜底判断

## 派发子代理前必须做到
1. 明确目标仓库、目标目录、目标文件
2. 先读取真实文件状态，不能靠记忆描述当前代码
3. 写清用户目标、非目标、验收标准
4. 写清不要改哪些文件、哪些相邻项目不能碰
5. 写清构建 / 测试 / 语法检查方式
6. 写清失败后怎么处理，不能允许静默跳过
7. 派发前先确认目标文件属于哪个 git 仓库，避免跨仓误改

## GPT 子代理高质量调用规则（新增统一要求）
- 默认允许把提示词写得非常细、非常长、非常具体
- 默认允许大量上下文注入：
  - 当前代码状态
  - 相关文件路径
  - 目标行为
  - 非目标
  - 反例
  - 不要改的文件
  - 验收标准
  - 运行命令
  - 历史坑点
- 不为了省 token 删除关键背景
- 提示词应显式包含：
  - 任务目标
  - 真实现状
  - 精确文件边界
  - 禁止事项
  - 完成标准
  - 输出格式
- 如果任务复杂，提示词里应加入“先分析再动手”的要求
- 如果任务容易误改相邻项目，提示词里必须写明负面约束
- 如果任务是多步链路，提示词里必须写明每一步的验收方式

## 提示词模板最少包含这些块
- 任务目标
- 当前状态
- 需要修改的文件
- 不要修改的文件
- 完成标准
- 运行 / 检查命令
- 失败时的处理方式

## 验收规则
1. 子代理返回后，主代理必须自己跑检查，不能只信“通过了”
2. 部署前必须做四项校验：源码目录、部署目录、部署方式、PM2 进程名与端口
3. 如果子代理改了不该改的文件，按以下顺序处理：
   - 先比对变更文件清单与授权文件清单
   - 未授权文件单独回退
   - 若错误改动和正确改动已经混在一起且无法安全拆分，则整份结果弃用
   - 回退后重新验收
4. 多个子代理改同一文件时，合并后必须重新验证
5. 子代理只负责改代码和提交结果，不直接执行部署；部署由主代理统一执行

## 失败处理
1. 子代理失败时先分析根因，不盲目重试
2. 构建失败时优先自己修，不要继续多轮传话
3. 失败、超时、无结果都必须单独记录
4. 任何一个子代理失败或无结果，不得对用户声称“全部完成”
5. 回复用户前必须核对：
   - 派出了几个子代理
   - 每个任务是什么
   - 是否全部返回
   - 是否覆盖了任务要求
   - 是否有任务被静默跳过
6. 禁止：
   - 只汇报成功的子代理，忽略失败的
   - 把“部分完成”说成“已完成”
   - 子代理失败后不处理就继续下一步

## 企业站额外审查
当目标项目是 `apps/luelan-company/` 时，除技术正确外，还必须审查：
- 是否提升企业可信度
- 是否清晰表达主营业务
- 是否与 OPC / 公司申报信息一致
- 是否存在夸大表述或容易引发审查疑虑的内容
- 改动前是否已经确认方向

## 04-brand-and-admin

# 品牌、联系人与后台公共信息

## 品牌
- 品牌名：掠蓝
- 署名：`掠蓝 出品`
- 品牌色：`#3b82c4`

## 联系方式
- QQ：`469906100`
- 微信：`pain_wei`
- 邮箱：`ylsssq@qq.com`

## 公司主体
- 名称：武汉掠蓝智能科技有限公司
- 状态：OPC 一人公司筹备 / 申报中
- 行业代码：`I6572`

## 后台账号说明
- 默认后台账号：`luelan`
- 默认后台密码：`Weijiang1.`
- Writing Pro 例外账号：`469906100@qq.com`

## 使用要求
- 涉及品牌展示、公司介绍、联系信息、后台入口时，以本文件为共享基线
- 项目本地如果有例外，只在项目本地规则中补充，不要回写多个重复版本

## 05-governance-and-exclusions

# 规则治理、编辑边界与排除目录

## 唯一权威规则体系
- 共享公共规则：工作区根 `/.claude/rules/shared/`
- 项目局部规则：各项目根 `/.claude/rules/project/`
- `CLAUDE.md` 只作为入口索引，不再承载大量重复正文
- `.cursor/`、`.kiro/`、`.codebuddy/`、`.trae/`、`.github/copilot-instructions.md` 均视为**生成物**，不得手工改成新的权威来源

## 编辑规则
- 修改公共规则：只改工作区根 `/.claude/rules/shared/`
- 修改项目规则：只改目标项目根 `/.claude/rules/project/`
- 修改后统一运行同步脚本，刷新各 IDE 适配层
- 不要在生成物里手改规则；若发现生成物与规则源不一致，应回到 canonical 文件修

## 不要当作权威规则源的目录
以下路径即使存在规则样式文件，也只当参考、历史、临时副本或第三方内容：
- `.deploy-tmp/`
- `**/cankao/`
- `**/_reference/`
- `**/backup/`
- `**/node_modules/`
- `apps/luelan-writing-pro/别人的kiro规则/`
- 外部参考仓库 / 样板仓库 / 第三方子项目

## 清理与迁移原则
- 不得因为“看起来重复”就直接删规则
- 每一条旧规则都必须有去向：
  - 上收为 shared
  - 留在 project
  - 明确标记为 legacy / reference / temp
- 完成迁移前，不得一次性粗暴清空旧规则

## 结果要求
- 每个项目都能通过自身目录下的规则入口文件被 IDE 默认读取
- 公共常量只保留一个 canonical 来源
- 项目局部坑点只保留在对应项目的 canonical 文件中
