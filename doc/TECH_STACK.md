# 技术栈

## 一、后端（Go）

| 类别 | 技术 | 用途 |
| ---- | ---- | ---- |
| 语言 | Go 1.26.2 | |
| Web 框架 | Gin | `cmd/server/main.go` 入口，`internal/` 私有包 |
| ORM | GORM (`gorm.io/gorm` + `gorm.io/driver/mysql`) | MySQL 数据访问 |
| 数据库 | MySQL | 主存储 |
| 对象存储 | MinIO | 文章附件、表单文件 |
| 对象存储 SDK | minio/minio-go | Go 操作 MinIO（上传、下载、预签名 URL） |
| JWT | golang-jwt/jwt/v5 | HS256，密钥来自 `JWT_SECRET` 环境变量 |
| 密码哈希 | golang.org/x/crypto/bcrypt | 用户注册/登录密码哈希 |
| 请求校验 | go-playground/validator | Gin binding 内置，基于 struct tag 声明校验规则 |
| CORS | gin-contrib/cors | 跨域中间件 |
| 限流 | ulule/limiter | 令牌桶/漏桶，按 IP / 路由限流，自带 Gin 中间件 driver |
| 日志 | log/slog | Go 1.21+ 标准库结构化日志 |
| 配置管理 | Viper | 支持环境变量、YAML、JSON、热重载 |
| 二维码生成 | skip2/go-qrcode | 纯 Go，PNG 输出 |
| CSV 导出 | encoding/csv | Go 标准库 |
| Excel 导出 | excelize | xlsx 读写 |
| HTML 清洗 | bluemonday | 白名单策略，文章内容防 XSS |
| Refresh Token 存储 | MySQL | `refresh_tokens` 表，记录 token_id + user_id + 过期时间，续签时标记旧记录失效 |
| 邮件发送 | net/smtp | 标准 SMTP 协议，兼容任何邮箱服务商 |
| 包管理 | Go Modules | 模块名 `github.com/rainbrookx/go-qrcode-saas` |

### 依赖安装命令

在 `gqs-backend/` 目录下执行：

```bash
go get github.com/gin-gonic/gin
go get gorm.io/gorm
go get gorm.io/driver/mysql
go get github.com/minio/minio-go/v7
go get github.com/golang-jwt/jwt/v5
go get golang.org/x/crypto
go get github.com/go-playground/validator/v10
go get github.com/gin-contrib/cors
go get github.com/ulule/limiter/v3
go get github.com/spf13/viper
go get github.com/skip2/go-qrcode
go get github.com/xuri/excelize/v2
go get github.com/microcosm-cc/bluemonday
```

---

## 二、前端（Next.js）

| 类别 | 技术 | 用途 |
| ---- | ---- | ---- |
| 框架 | Next.js 16.2.6 (App Router) | |
| UI 库 | React 19.2.4 | |
| 语言 | TypeScript ^5 | |
| CSS | Tailwind CSS ^4 | v4，无 `tailwind.config.js` |
| 组件库 | Ant Design | 统一 UI |
| 富文本编辑器 | TipTap | 文章编辑 |
| 表单设计器 | alibaba/x-render | FormRender + FormBuilder |
| HTTP 客户端 | axios | API 调用、拦截器、自动 JSON 转换 |
| 二维码生成 | qrcode.react | 文本 / 网址静态码前端生成 |
| 二维码解码 | jsQR | 解码 Tab 上传图片解析 |
| XSS 清洗 | DOMPurify | 文章内容前端渲染安全 |
| 状态管理 | zustand | 全局认证状态、用户信息 |
| 包管理 | pnpm | |

### 依赖安装命令

在 `gqs-frontend/` 目录下执行：

```bash
pnpm add antd @ant-design/icons
pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align @tiptap/extension-underline @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight
pnpm add xrender form-render
pnpm add axios
pnpm add qrcode.react
pnpm add jsqr
pnpm add dompurify
pnpm add zustand
pnpm add -D @types/dompurify
```

---

## 三、基础设施

| 类别 | 技术 | 说明 |
| ---- | ---- | ---- |
| 数据库 | MySQL | 主存储（业务数据 + Refresh Token + 验证码） |
| 对象存储 | MinIO | 附件 |
