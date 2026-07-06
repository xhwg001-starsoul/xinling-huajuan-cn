# 心灵画卷 教师版

这是“心灵画卷 · 房树人绘画心理观察辅助系统”的内部测试版。v0.4 起账号、角色、机构配置和安全使用统计迁移到 Supabase；系统仍不保存学生图片、学生姓名、背景资料正文或 AI 报告正文。

## 本地运行

1. 安装依赖：

```powershell
npm install
```

2. 复制 `.env.example` 为 `.env.local`，填写本地环境变量：

```text
ACCESS_CODE=你的内部访问码
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
http://127.0.0.1:4173
```

## Supabase 初始化

1. 创建 Supabase 项目。
2. 打开 Supabase SQL Editor。
3. 复制并执行 `supabase/schema.sql`。
4. 在 Supabase Project Settings 中获取：
   - Project URL
   - anon public key
   - service_role key
5. 把这些值写入本地 `.env.local` 和 Vercel 环境变量。

## v0.4 环境变量

前端可用，但仍通过 `/api/supabase-config` 读取：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

仅后端使用，绝不能写进前端代码：

```text
SUPABASE_SERVICE_ROLE_KEY
ADMIN_INIT_CODE
OPENAI_API_KEY
ACCESS_CODE
```

## Vercel 部署

在 Vercel 项目的 Settings -> Environment Variables 中设置：

```text
ACCESS_CODE
OPENAI_API_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_INIT_CODE
MODEL_PROVIDER
```

可选模型变量：

```text
VISION_MODEL_PROVIDER
TEXT_MODEL_PROVIDER
OPENAI_VISION_MODEL
OPENAI_TEXT_MODEL
QWEN_API_KEY
DOUBAO_API_KEY
GLM_API_KEY
XUNFEI_API_KEY
STEPFUN_API_KEY
```

设置后重新部署 Vercel。

## 初始化第一个管理员

1. 打开网站公开首页。
2. 点击“教师内部试用入口”。
3. 输入 `ACCESS_CODE`。
4. 在云端账号区域填写初始化码 `ADMIN_INIT_CODE`、管理员账号、密码和机构信息。
5. 初始化成功后，用管理员账号登录。
6. 管理员进入教师工作台创建教师账号。

前端只显示“登录账号 + 密码”，不会要求真实邮箱。系统内部会把 `teacher001` 转换为 `teacher001@xinlinghuajuan.invalid` 交给 Supabase Auth 使用。

## 云端数据边界

Supabase 只保存：

- 账号与角色
- 机构配置
- 安全使用统计元数据

`usage_records` 只包含生成时间、生成类型、教师代号、账号角色、是否风险相关等安全元数据。严禁保存学生姓名、学生编号、图片、图片文件名、背景资料正文或 AI 报告正文。

## 为什么不能把密钥写进前端

前端 HTML、CSS、JS 会被浏览器下载，任何人都能查看源码。`OPENAI_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`ADMIN_INIT_CODE` 一旦写进前端就会泄露。当前项目只在后端 API 和 Vercel 环境变量中读取这些敏感信息。

## 当前限制

v0.4 仍是内部测试版：

- 不开放公众注册；
- 不做短信、微信登录；
- 不做支付、套餐、充值；
- 不保存历史案例正文；
- 云端统计清空接口后续再做；
- 不适合直接公开大规模使用。
