# Go QRCode SaaS

Go QRCode SaaS 是一个开源二维码 SaaS 项目，提供静态二维码生成、动态短链接二维码、文章二维码、表单二维码和二维码解码能力。项目分为独立的前端和后端两部分：

- `gqs-frontend/`：Next.js App Router 前端应用，负责页面、二维码预览、前端静态码生成、解码和用户交互。
- `gqs-backend/`：Go + Gin 后端服务，负责用户认证、动态码数据、短链接跳转、访问统计、文章/表单等持久化能力。
- `doc/`：产品需求、接口契约、UI 规范和技术栈说明。

## 主要功能

| 功能 | 是否需要登录 | 数据持久化 | 说明 |
|---|---:|---:|---|
| 文本二维码 | 否 | 否 | 仅在浏览器端生成二维码。 |
| 网址静态码 | 否 | 否 | 仅在浏览器端生成二维码。 |
| 网址跳转码 | 是 | 是 | 生成可编辑的短链接 `/u/<code>`，支持访问统计。 |
| 文章二维码 | 是 | 是 | 生成文章短链接 `/a/<code>`，支持富文本和附件。 |
| 表单二维码 | 是 | 是 | 生成表单短链接 `/f/<code>`，支持匿名提交和统计。 |
| 二维码解码 | 否 | 否 | 仅在浏览器端识别二维码内容。 |

## 技术栈

### 前端

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind CSS v4
- Ant Design 6
- Zustand
- Axios
- TipTap
- form-render
- qrcode.react
- jsqr
- pnpm

### 后端

- Go 1.26.2
- Gin
- GORM
- MySQL
- JWT
- MinIO
- SMTP 邮件服务

## 目录结构

```text
.
├── doc/                 # 需求、API、UI、技术栈文档
├── gqs-backend/         # Go 后端项目
└── gqs-frontend/        # Next.js 前端项目
```

## 环境准备

请先准备以下运行环境：

- Go 1.26.2+
- Node.js 与 pnpm
- MySQL
- MinIO（文章附件等上传能力需要）
- SMTP 服务（注册、验证码、重置密码等邮件能力需要）

后端配置通过 `gqs-backend/.env` 或环境变量提供。常用变量如下：

```env
DB_DSN=root:password@tcp(127.0.0.1:3306)/db_go_qrcode_saas?charset=utf8mb4&parseTime=True&loc=Local
JWT_SECRET=<your-jwt-secret>
MINIO_ENDPOINT=127.0.0.1:9000
MINIO_ACCESS_KEY=<your-minio-access-key>
MINIO_SECRET_KEY=<your-minio-secret-key>
MINIO_BUCKET=go-qrcode-saas
SMTP_ENABLED=false
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
BASE_URL=http://localhost:3000
```

生产环境务必替换 `JWT_SECRET`，不要使用默认值。

## 本地开发运行

### 1. 启动后端

```bash
cd gqs-backend
go run ./cmd/server
```

后端默认监听：

```text
http://localhost:8080
```

健康检查接口：

```text
GET http://localhost:8080/api/v1/health
```

### 2. 启动前端

```bash
cd gqs-frontend
pnpm dev
```

前端默认监听：

```text
http://localhost:3000
```

前端 API 请求默认使用 `/api/v1` 相对路径。开发环境通常需要通过 Next.js 代理、反向代理或同源部署方式把 `/api/v1` 转发到后端服务。

## 打包构建

### 后端构建

```bash
cd gqs-backend
go build ./...
```

如需生成可执行文件：

```bash
cd gqs-backend
go build -o gqs-server ./cmd/server
```

在 Windows 系统上使用 PowerShell 交叉编译

```powershell
$env:CGO_ENABLED="0"; $env:GOOS="linux"; $env:GOARCH="amd64"; go build -ldflags "-s -w" -trimpath -o gqs-server .\cmd\server\main.go
```

运行构建后的后端服务：

```bash
./gqs-server
```

### 前端构建

```bash
cd gqs-frontend
pnpm build

# 本地打包（先 build 后）
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# 压缩
tar -czf gqs-frontend-deploy.tar.gz -C .next/standalone .
```

运行生产模式前端：

```bash
cd gqs-frontend
pnpm start
```

## 代码检查与测试

### 后端

```bash
cd gqs-backend
go vet ./...
go test ./...
```

### 前端

```bash
cd gqs-frontend
pnpm lint
pnpm build
```

## 部署说明

一种常见部署方式：

1. 构建并启动后端服务，监听 `8080` 或由环境配置/进程管理器接管。
2. 构建并启动前端生产服务，监听 `3000`。
3. 使用 Nginx、Caddy 或平台网关统一暴露站点：
   - `/` 转发到前端服务。
   - `/api/v1` 转发到后端服务。
   - `/u/<code>`、`/a/<code>`、`/f/<code>` 转发到后端服务。
4. 配置 MySQL、MinIO、SMTP 和所有生产环境变量。

## 参考文档

- `doc/SRS.md`：产品需求与业务规则
- `doc/API.md`：REST API 契约
- `doc/UI_STYLE_GUIDE.md`：UI 设计规范
- `doc/TECH_STACK.md`：技术栈说明
