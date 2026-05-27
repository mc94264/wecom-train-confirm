# 企微培训效果确认机器人

管理员创建安全培训任务，AI 提取培训重点，通过企微推送给员工，员工通过 H5 语音复述理解内容，AI 分析理解程度，管理端展示看板数据。

## 访问地址

| 环境 | 地址 | 说明 |
|------|------|------|
| 生产（域名）| `http://app.ruibx.com` | 已解析到服务器，HTTP（待配 HTTPS）|
| 生产（IP）| `http://8.148.203.96` | 阿里云 ECS，Nginx 80 端口 |
| 生产（备）| `http://8.148.203.96:6080` | 6080 同样转发到应用 |
| 本地开发 | `http://localhost:3000` | `npm run dev` |

## 后台管理

所有管理页面均通过 **Basic Auth** 保护，用户名 `admin`，密码为环境变量 `ADMIN_PASSWORD`。

### 1. 培训任务列表（首页）

> 路径：`/admin`

- **新建培训任务**：右上角按钮，支持文字稿和录音两种方式
- **任务状态流转**：
  - `草稿` → `内容就绪` → `提取重点中` → `待确认重点` → `已推送` → `收集中` → `分析中` → `已完成`
- **状态筛选**：列表展示所有培训任务，包含参与人数、创建时间、当前状态

### 2. 新建培训任务

> 路径：`/admin/sessions/new`

两种输入方式：

**A. 录入文字稿**
- 粘贴培训宣讲的完整文字稿
- 系统自动提取培训重点（AI 分析）
- 建议 200 字以上

**B. 上传录音**
- 选择培训宣讲的录音文件（MP3、WAV、M4A、WEBM、AMR）
- 三阶段进度展示：上传 → 转写 → 创建
- XMLHttpRequest 实时上传进度条
- 自动转写录音内容为文字

### 3. 确认培训重点

> 路径：`/admin/sessions/:id/confirm`

AI 自动提取培训重点后进入此页面，管理员可以：
- **查看** AI 提取出的培训重点列表
- **编辑** 每条重点的标题、描述、关键词
- **新增** 或 **删除** 重点条目
- **重新提取** 不满意时可以重新让 AI 提取
- **确认并继续**：确认重点后进入分配页面

### 4. 培训任务详情 & 数据看板

> 路径：`/admin/sessions/:id`

核心管理页面，包含：

**数据概览卡片**
- 总员工、已回复数及回复率、理解通过数及通过率、需纠正数

**培训重点展示**
- 已确认的培训重点列表，含标题和详细描述

**分配员工**
- 同步企微通讯录：点击「同步通讯录」拉取企微内部联系人
- 勾选员工分配到此培训任务
- 推送到企微：为已分配且绑定了企微账号的员工发送培训通知
  - 通知内容包含培训标题和专属回复链接
  - 点击链接进入 H5 回复页面

**外部客户推送**
- 同步外部联系人：拉取企微外部联系人（微信客户）
- 选择外部客户推送培训确认任务

**员工明细表格**
- 每位员工的状态（未开始 / 已打开 / 已回复 / 已转写 / 已分析）
- 录音播放、转写文字预览、理解程度评分
- 手动触发「转写」和「分析」操作
- 点击「详情」弹窗查看完整分析报告

### 5. 平台配置管理

> 路径：`/admin/config`

配置系统接入的 AI 服务：

**模型供应商**
- 添加和管理 AI 模型供应商（如 DeepSeek、OpenAI 等）
- 配置 API 基础地址

**模型连接**
- 为每个供应商添加具体的模型连接
- 配置 API Key 引用、模型名称
- 测试连接是否可用
- 设置默认模型

**Agent 规格**
- 配置各 AI Agent（ASR 转写、LLM 分析等）使用的模型连接

**服务配置**
- 存储服务：本地存储 / 阿里云 OSS
- 其他系统级配置

## 员工端 H5 回复流程

1. 员工在企微中收到培训通知消息，点击专属链接
2. H5 页面展示培训标题和培训重点
3. 员工用语音复述对培训内容的理解：
   - **企微中打开**：使用 JS-SDK 原生录音（自动上传企微服务器）
   - **浏览器中打开**：使用 MediaRecorder 降级录音
   - 也支持手动输入文字复述
4. 提交后系统后台自动处理：
   - ASR 转写语音为文字 → LLM 分析理解程度 → 保存分析结果
   - 前端轮询等待结果（3 秒间隔，最长 6 分钟）
5. 分析完成展示结果页面：
   - 综合得分环形图
   - 理解程度评级（理解到位 / 基本理解 / 理解不足 / 存在偏差）
   - 评价摘要、已掌握重点、遗漏重点、理解偏差
   - 纠正建议
6. 分析完成后，企微自动推送分析结果通知给员工（含查看链接）

## 部署指南

### 前置条件

- Node.js 18+
- 阿里云 ECS（当前 `8.148.203.96`）
- Nginx（配置 80/6080 → 3000 转发）
- 企业微信应用（corpId、agentId、secret）

### 环境变量

```
DATABASE_URL=file:./dev.db              # SQLite 数据库路径
ADMIN_PASSWORD=TrainAdmin2024!          # 管理端 Basic Auth 密码

# 企微应用配置
WECOM_CORP_ID=xxx
WECOM_AGENT_ID=xxx
WECOM_APP_SECRET=xxx

# 企微 MCP 机器人配置（可选）
WECOM_MCP_BOT_ID=xxx
WECOM_MCP_BOT_SECRET=xxx

# 外部 AI 服务网关
TELESPEECH_ASR_URL=http://xxx:4000/v2/audio/asr
LLM_API_URL=http://xxx:4000/v1/chat/completions
LLM_API_KEY=xxx

# 部署域名
NEXT_PUBLIC_BASE_URL=http://8.148.203.96
```

### 本地构建 & 部署

```bash
# 1. 本地构建
npm run build

# 2. 打包部署（包含 .next/static/）
tar -czf deploy.tar.gz \
  .next/standalone/ \
  .next/static/ \
  public/ \
  prisma/ \
  node_modules/.prisma/ \
  package.json

# 3. 上传到服务器
scp deploy.tar.gz root@8.148.203.96:/opt/wecom-train-confirm/

# 4. 服务器解压 & 启动
ssh root@8.148.203.96
cd /opt/wecom-train-confirm
tar -xzf deploy.tar.gz

# 生成 Prisma Client（需匹配服务器架构）
npx prisma generate

# 启动
kill $(lsof -ti:3000)
nohup node .next/standalone/server.js > app.log 2>&1 &
```

### Nginx 配置

```nginx
# /etc/nginx/conf.d/app.conf — 80 端口
server {
    listen 80;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}

# /etc/nginx/conf.d/app-6080.conf — 6080 端口
server {
    listen 6080;
    server_name _;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 300s;
    }
}
```

> **域名配置提示：** `app.ruibx.com` 已解析到服务器，当前为 HTTP 访问。如需 HTTPS，在 Nginx 配置中把 `server_name` 改为 `app.ruibx.com`，再申请 SSL 证书即可。

### 服务器项目目录

```
/root/wecom-train-confirm/   # 源码（git 同步用）
/opt/wecom-train-confirm/    # 运行目录（standalone 产物）
```

## 企微后台配置

| 配置项 | 值 |
|--------|-----|
| 应用 AgentId | 1000005 |
| 企业可信 IP | `8.148.203.96` |
| 可信域名 | `app.ruibx.com`（待完成企微验证）|
| JS-SDK 接口 | startRecord、stopRecord、onVoiceRecordEnd、playVoice、pauseVoice、stopVoice、uploadVoice、downloadVoice |
| 消息推送方式 | `message/send` 单推指定员工（非群聊机器人）|

### JS-SDK 验证文件

下载企微后台的验证文件放到 `public/` 目录下。

## 技术栈

| 层 | 技术 |
|----|------|
| 框架 | Next.js 16 + React 19 + TypeScript |
| 样式 | Tailwind CSS |
| 数据库 | SQLite + Prisma 6 |
| 录音（企微） | 企微 JS-SDK 原生录音（wx.startRecord 等） |
| 录音（浏览器） | MediaRecorder API（降级方案）|
| 语音推送 | 企微 message/send 单推 |
| ASR 转写 | telespeech-asr（公司网关）|
| LLM 分析 | deepseek-v4-pro（公司网关）|
| 部署 | Node.js standalone + Nginx 反向代理 |
| 服务器 | 阿里云 ECS（8.148.203.96）|

## 数据模型

- **TrainingSession** — 培训任务（标题、状态、文字稿、摘要）
- **TrainingKeyPoint** — 培训重点（标题、描述、关键词）
- **Employee** — 员工信息（姓名、部门、企微账号）
- **TrainingAssignment** — 任务分配（员工→培训、唯一 token、状态）
- **EmployeeReply** — 员工回复（音频路径、转写文字）
- **UnderstandingAnalysis** — 理解分析（评分、评级、覆盖/遗漏/偏差点）
- **ExternalContact** — 外部联系人（微信客户）
- **ModelProvider / ModelConnection / AgentSpec / ServiceConfig** — AI 服务配置

## 部署注意事项

1. **构建产物**：`standalone` 模式不包含 `.next/static/`，打包时需手动包含
2. **数据库**：`prisma/prisma/` 下的 dev.db 不要提交到 git
3. **Nginx**：`client_max_body_size` 需设为 100M 以上支持大音频文件
4. **超时**：ASR 转写可能耗时较长，Nginx `proxy_read_timeout` 设为 300s
5. **Prisma Client**：需在目标架构上重新 `generate`（当前为 `debian-openssl-3.0.x`）
6. **阿里云安全组**：22 端口建议固定白名单 IP

## 常见问题

**Q: 员工端 H5 提示"加载中..."不动**
检查服务器 `.next/static/` 是否已同步。Standalone 构建需要手动复制静态资源。

**Q: 员工端弹出 Basic Auth 认证框**
`/api/wecom/jssdk-config` 已在 middleware 白名单中排除，检查是否部署的是最新代码。

**Q: 上传录音返回 413**
Nginx 的 `client_max_body_size` 是否已设为 100M。

**Q: 录音上传后卡在转写阶段**
检查 ASR 服务网关能否连通（当前 `8.163.99.43:4000` 可能是内网地址）。

**Q: 企微录音 60 秒上限**
企微平台限制，`startRecord` 的 `duration: 300` 参数可能不生效。
