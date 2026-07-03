# 心灵画卷 教师内部测试版

这是一个适合部署到 Vercel 的“房树人绘画心理观察辅助系统”内部测试版。当前版本不做完整会员注册系统、管理员后台或数据库，不保存历史案例。

## 本地运行

复制 `.env.example` 为 `.env.local`，并填写本地测试配置：

```text
ACCESS_CODE=你的内部访问码
OPENAI_API_KEY=你的 OpenAI API Key
```

`.env.local` 只用于本地开发，已被 `.gitignore` 忽略，不能上传到 GitHub。

如果需要代理：

```powershell
$env:HTTPS_PROXY="http://127.0.0.1:7897"
$env:HTTP_PROXY="http://127.0.0.1:7897"
node --use-env-proxy local-server.js
```

不需要代理时：

```powershell
npm start
```

浏览器访问：

```text
http://127.0.0.1:4173
```

如果使用项目里的 `启动心灵画卷.bat`，请确保系统环境变量中已经有 `ACCESS_CODE` 和 `OPENAI_API_KEY`。

## Vercel 部署

项目结构已经适配 Vercel：

```text
index.html
app.js
styles.css
model-adapters.js
api/analyze.js
api/verify-access.js
package.json
```

前端页面是静态文件，后端接口位于 `api/` 目录：

- `/api/verify-access`：校验内部访问码
- `/api/analyze`：校验访问码后调用模型生成报告

## Vercel 环境变量

在 Vercel 项目后台的 Settings → Environment Variables 中设置：

```text
ACCESS_CODE=你的内部访问码
OPENAI_API_KEY=你的 OpenAI API Key
MODEL_PROVIDER=openai
```

可选：

```text
VISION_MODEL_PROVIDER=openai
TEXT_MODEL_PROVIDER=openai
OPENAI_VISION_MODEL=gpt-4.1
OPENAI_TEXT_MODEL=gpt-4.1
```

已经预留但尚未接入真实请求格式的供应商变量：

```text
QWEN_API_KEY
DOUBAO_API_KEY
GLM_API_KEY
XUNFEI_API_KEY
STEPFUN_API_KEY
```

## 为什么不能把 API Key 写进前端

前端 HTML、CSS、JS 会被浏览器下载，任何人都可以查看源码。如果把 `OPENAI_API_KEY` 写进前端，密钥会泄露，别人可以用你的额度调用 API。当前项目只在后端接口中读取环境变量，前端不会直接调用 OpenAI。

## 内部测试限制

当前版本仅适合小范围内部测试：

- 不保存上传图片和分析报告；
- 不提供历史案例管理；
- 不提供正式账号系统；
- 不提供管理员后台；
- 内部访问码只是轻量门槛，不等同于完整权限系统；
- 不适合直接公开大规模使用。

正式上线前，应增加后端账号系统、数据库、权限管理、日志审计、隐私合规流程和更完整的安全防护。
