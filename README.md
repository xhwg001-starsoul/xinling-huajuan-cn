# 心灵画卷 · 大陆版准备项目

本项目基于“心灵画卷”海外学习版复制而来，当前用于准备中国大陆备案域名、国内云服务器、国内大模型和国内数据库适配。

当前项目仍处于技术准备阶段，暂不面向公众开放。现阶段保留原有功能结构，包括公开首页、教师登录、云端账号系统、教师工作台、报告生成、复制、打印、Word/TXT 导出等。

本项目不是心理诊断工具。系统生成内容仅供绘画表达观察、访谈准备和学校心理辅导参考，不能替代专业心理诊断、医学诊断或治疗建议。

后续计划逐步适配：

- 百度云服务器部署
- 国内大模型 API
- 国内数据库或自建数据库
- 学校内部账号与合规流程

## 当前技术基线

当前大陆版准备项目从“心灵画卷-教师版”本地克隆而来，保留原 Git 历史。当前基础版本包含 v0.4 Supabase 云端账号系统与 v0.4.1 账号密码管理能力。

现阶段仍保留 OpenAI、Supabase 与 Vercel 相关代码，便于对照海外学习版继续验证功能。大陆版后续会逐步替换为国内部署、国内模型和国内数据库方案。

## 本地运行

1. 安装依赖：

```powershell
npm install
```

2. 复制 `.env.example` 为 `.env.local`，填写本地环境变量：

```text
ACCESS_CODE=旧版兼容访问码（大陆版账号模式可留空）
OPENAI_API_KEY=你的 OpenAI API Key
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase service_role key
ADMIN_INIT_CODE=你的管理员初始化码
```

`.env.local` 已被 `.gitignore` 忽略，不要提交到 GitHub。

3. 启动：

```powershell
npm start
```

4. 浏览器访问：

```text
http://127.0.0.1:4185
```

## 环境变量

当前仍使用海外学习版已有变量：

```text
ACCESS_CODE（仅海外版或旧版兼容）
OPENAI_API_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_INIT_CODE
```

## 大陆版准备模式说明

当前大陆版尚未接入正式国内数据库，默认使用大陆版本地准备模式：

```text
APP_REGION=cn
AUTH_PROVIDER=cn-dev
SETTINGS_PROVIDER=file
ACCESS_CODE=旧版兼容访问码（大陆版账号模式可留空）
ADMIN_SETTINGS_CODE=你的管理员设置码
```

- `ACCESS_CODE` 仅用于海外版或旧版兼容流程；大陆版账号模式不再使用该变量。
- `ADMIN_SETTINGS_CODE` 仅用于开发阶段临时保护“模型设置”，不是正式账号系统。
- 当前账号系统暂不使用 Supabase；未配置 Supabase 时，系统会自动进入 `cn-dev` 模式。
- 模型 API Key 只能放在服务器环境变量中，不能写入前端代码或模型设置文件。
- `SETTINGS_PROVIDER=file` 时，模型设置会保存到 `data/model-settings.local.json`。
- `data/*.local.json` 不应提交到 GitHub，文件中也只允许保存 provider 和 model 名称，不保存任何 API Key。

大陆版未来预留变量：

```text
MODEL_PROVIDER
DEEPSEEK_API_KEY
QIANFAN_API_KEY
DOMESTIC_DATABASE_URL
```

以上国内模型和国内数据库变量当前准备阶段暂未启用，不会被现有代码强制读取。

## 通义千问 Qwen-VL 读图说明

- Qwen-VL 只用于 `split` 模式的视觉观察阶段，只输出客观画面观察，不进行心理诊断。
- Qwen-VL 不生成最终心理报告；最终报告仍由 `textProvider`（例如 DeepSeek）根据纯文本观察和教师填写资料生成。
- `QWEN_API_KEY` 只能配置在 `.env.local` 或服务器环境变量中，不能写入前端或提交到 GitHub。
- 模型设置文件只保存 provider 和 model 名称，不保存 API Key。
- `QWEN_BASE_URL` 应填写阿里云百炼提供的 OpenAI 兼容地址，`QWEN_VISION_MODEL` 可作为视觉模型环境变量默认值。

## 大陆版账号数据库基础

- 当前使用 SQLite 作为大陆版本地开发账号数据库，数据库文件位于 `data/xinling-cn.local.db`。
- 数据库文件及其运行时附属文件不应提交到 GitHub；项目的 `.gitignore` 已忽略 `data/*.db`、`data/*.sqlite` 和 `data/*.local.db`。
- 首次初始化管理员使用服务器环境变量 `CN_ADMIN_INIT_CODE`；session 保护使用 `CN_SESSION_SECRET`，真实值只能配置在 `.env.local` 或服务器环境变量中。
- 当前只建立学校内部机构、管理员、教师、session 和安全使用元数据基础，不是会员或付费系统。
- 正式部署前可根据并发、备份和运维需求迁移到 PostgreSQL 或国内云数据库。
- 数据库不保存学生图片、学生背景资料正文、AI 报告正文或任何模型 API Key。

大陆模式前端采用“公开首页 → 教师登录 → 分析系统 / 教师工作台”流程，不再要求 `ACCESS_CODE`。session token 仅保存在浏览器 `sessionStorage` 的 `xinling_cn_session_token` 中，关闭会话后不会长期保留。管理员可管理本机构教师账号，并进入受 `ADMIN_SETTINGS_CODE` 二次保护的模型设置；教师角色只显示普通分析功能、账号信息和教师工作台。

### 教师账号管理

- 管理员可以在教师工作台中查看本机构账号、创建 teacher、启用或停用 teacher，以及重置 teacher 临时密码。
- 新建或重置密码后的 teacher 首次登录只能修改密码；修改成功后全部 session 会失效，必须使用新密码重新登录。
- 停用账号、管理员重置密码、用户修改自己的密码都会立即撤销该用户已有 session。
- 当前为单机构学校内部账号系统，不开放公众注册，不包含支付、会员、短信验证码或微信登录。

## 机构管理与使用统计

- 大陆版机构信息与安全使用记录保存在 SQLite 数据库 `data/xinling-cn.local.db` 中，不再以 localStorage 或 Supabase 作为真实数据来源。
- 管理员可以修改本机构信息、查看全机构统计并按教师、日期和报告类型筛选；教师只能查看机构信息和自己的安全统计。
- 报告页面、打印、TXT 与 Word 导出使用数据库中的机构名称、机构类型、使用场景和报告署名；读取失败时使用安全默认值，不影响报告正文生成。
- 使用记录仅包含账号、报告类型、风险类别、模型组合和生成时间等安全元数据，不保存学生图片、学生资料、视觉观察、完整 Prompt 或 AI 报告正文。
- 模型设置仍保存在 `data/model-settings.local.json`，本阶段不迁移模型 Key 或 provider 配置到 SQLite。

## Supabase 初始化

当前阶段仍保留 Supabase 方案：

1. 创建 Supabase 项目。
2. 打开 Supabase SQL Editor。
3. 复制并执行 `supabase/schema.sql`。
4. 在 Supabase Project Settings 中获取 Project URL、anon public key、service_role key。
5. 把这些值写入本地 `.env.local` 或线上环境变量。

## 数据边界

当前系统只保存账号、角色、机构配置和安全使用统计元数据。

严禁保存学生姓名、学生编号、图片、图片文件名、背景资料正文或 AI 报告正文。报告导出只发生在用户点击导出按钮时，由浏览器下载到本机。

## 当前限制

大陆版准备项目暂不做以下事项：

- 不接入国内大模型
- 不接入国内数据库
- 不开放公众注册
- 不做短信、微信登录
- 不做支付、套餐、充值
- 不保存历史案例正文
- 不适合直接公开大规模使用

正式在中国大陆上线前，应完成备案、服务器部署、安全加固、隐私合规、学校授权流程、模型供应商合规评估和数据存储方案确认。
