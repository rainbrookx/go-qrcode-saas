# 接口文档

基础信息：

- Base URL：`https://<主站域名>/api/v1`
- 认证方式：Bearer Token（JWT），登录后所有需认证接口须在 Header 中携带 `Authorization: Bearer <access_token>`
- 通用响应格式：JSON

---

## 通用结构

### 成功响应

```json
{
  "code": 0,
  "message": "ok",
  "data": { ... }
}
```

### 错误响应

```json
{
  "code": 40001,
  "message": "具体错误描述",
  "data": null
}
```

### 错误码规范

| 范围 | 含义 |
| ---- | ---- |
| 0 | 成功 |
| 40000–40099 | 通用请求错误（参数校验、格式错误） |
| 40100–40199 | 认证与授权错误 |
| 40200–40299 | 用户相关错误 |
| 40300–40399 | 网址跳转码相关错误 |
| 40400–40499 | 文章相关错误 |
| 40500–40599 | 表单相关错误 |
| 40600–40699 | 文件上传相关错误 |
| 50000–50099 | 服务端内部错误 |

### 分页请求参数

| 参数 | 类型 | 默认值 | 说明 |
| ---- | ---- | ------ | ---- |
| `page` | int | 1 | 页码，从 1 开始 |
| `page_size` | int | 20 | 每页条数，最大 100 |

### 分页响应结构

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [ ... ],
    "total": 150,
    "page": 1,
    "page_size": 20
  }
}
```

---

## 一、认证模块

### 1.1 注册

`POST /auth/register`

**无需登录**

注册后不会自动登录，需调用登录接口。

**请求体**

```json
{
  "email": "user@example.com",
  "password": "MyP@ss123",
  "confirm_password": "MyP@ss123"
}
```

| 字段 | 类型 | 必填 | 校验规则 |
| ---- | ---- | ---- | ---- |
| `email` | string | 是 | 合法邮箱格式，最大 254 字符 |
| `password` | string | 是 | 8–64 字符，须包含大小写字母和数字 |
| `confirm_password` | string | 是 | 须与 `password` 一致 |

**成功响应** `201`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40001 | 参数校验失败（字段不满足规则） |
| 40201 | 邮箱已被注册 |

---

### 1.2 登录

`POST /auth/login`

**无需登录**

支持两种登录方式：密码登录、邮箱验证码登录。

#### 1.2.1 密码登录

**请求体**

```json
{
  "grant_type": "password",
  "email": "user@example.com",
  "password": "MyP@ss123"
}
```

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `grant_type` | string | 是 | 固定 `"password"` |
| `email` | string | 是 | 邮箱 |
| `password` | string | 是 | 密码 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "refresh_expires_in": 259200,
    "user": {
      "id": 1,
      "email": "user@example.com",
      "active_code_count": 3
    }
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `access_token` | string | Access Token，HS256 签名，用于接口认证 |
| `refresh_token` | string | Refresh Token，HS256 签名，用于续签 |
| `expires_in` | int | Access Token 有效期，单位秒，固定 86400（24h） |
| `refresh_expires_in` | int | Refresh Token 有效期，单位秒，固定 259200（3 天） |
| `user.id` | int | 用户 ID |
| `user.email` | string | 用户邮箱 |
| `user.active_code_count` | int | 当前活码数量（urldyn + article + form） |

#### 1.2.2 邮箱验证码登录

**前置步骤**：先调用 `POST /auth/verify-code` 发送验证码。

**请求体**

```json
{
  "grant_type": "email_code",
  "email": "user@example.com",
  "code": "123456"
}
```

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `grant_type` | string | 是 | 固定 `"email_code"` |
| `email` | string | 是 | 邮箱 |
| `code` | string | 是 | 6 位数字验证码 |

**成功响应**：同密码登录。

**错误码**

| code | 说明 |
| ---- | ---- |
| 40101 | 邮箱或密码错误 |
| 40102 | 验证码错误或已过期 |
| 40103 | 账号不存在（验证码登录时） |

---

### 1.3 发送邮箱验证码

`POST /auth/verify-code`

**无需登录**

用于邮箱验证码登录和找回密码。同一邮箱 60 秒内限发一次。

**请求体**

```json
{
  "email": "user@example.com",
  "purpose": "login"
}
```

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `email` | string | 是 | 合法邮箱 |
| `purpose` | string | 是 | `"login"` 登录 / `"reset_password"` 找回密码 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40104 | 发送过于频繁，请 60 秒后重试 |
| 40105 | purpose=login 但邮箱未注册 |
| 40106 | purpose=reset_password 但邮箱未注册 |

---

### 1.4 找回密码（重置密码）

`POST /auth/reset-password`

**无需登录**

**前置步骤**：先调用 `POST /auth/verify-code`（`purpose=reset_password`）发送验证码。

**请求体**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "new_password": "NewP@ss456",
  "confirm_password": "NewP@ss456"
}
```

| 字段 | 类型 | 必填 | 校验规则 |
| ---- | ---- | ---- | ---- |
| `email` | string | 是 | 合法邮箱 |
| `code` | string | 是 | 6 位数字验证码 |
| `new_password` | string | 是 | 8–64 字符，须包含大小写字母和数字 |
| `confirm_password` | string | 是 | 须与 `new_password` 一致 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40102 | 验证码错误或已过期 |
| 40106 | 邮箱未注册 |
| 40001 | 密码格式不符合要求 |

---

### 1.5 修改密码

`POST /auth/change-password`

**需要登录**

用于已登录用户修改密码，需验证旧密码。

**请求体**

```json
{
  "old_password": "OldP@ss123",
  "new_password": "NewP@ss456",
  "confirm_password": "NewP@ss456"
}
```

| 字段 | 类型 | 必填 | 校验规则 |
| ---- | ---- | ---- | ---- |
| `old_password` | string | 是 | 当前密码 |
| `new_password` | string | 是 | 8–64 字符，须包含大小写字母和数字，不可与旧密码相同 |
| `confirm_password` | string | 是 | 须与 `new_password` 一致 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

> 修改密码后已签发的 Access Token 与 Refresh Token 不失效，用户可继续使用，也可选择重新登录。

**错误码**

| code | 说明 |
| ---- | ---- |
| 40107 | 旧密码错误 |
| 40108 | 新密码与旧密码相同 |
| 40001 | 密码格式不符合要求 |

---

### 1.6 续签 Token

`POST /auth/refresh`

**无需登录**（使用 Refresh Token 认证）

Access Token 过期后，前端使用 Refresh Token 调用此接口换取新的 Token 对。续签后旧 Refresh Token 立即失效（单次使用）。

**请求体**

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `refresh_token` | string | 是 | 登录或上次续签时获取的 Refresh Token |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "refresh_expires_in": 259200
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `access_token` | string | 新的 Access Token |
| `refresh_token` | string | 新的 Refresh Token（旧 Token 已失效） |
| `expires_in` | int | Access Token 有效期，单位秒 |
| `refresh_expires_in` | int | Refresh Token 有效期，单位秒 |

**错误码**

| code | 说明 |
| ---- | ---- |
| 40109 | Refresh Token 无效或已过期，需重新登录 |
| 40110 | Refresh Token 已被使用（可能重放攻击），需重新登录 |

---

### 1.7 获取当前用户信息

`GET /auth/me`

**需要登录**

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "active_code_count": 3,
    "created_at": "2026-01-15T10:30:00Z"
  }
}
```

---

## 二、用户配额

### 2.1 查询配额

`GET /user/quota`

**需要登录**

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "total": 100,
    "used": 3,
    "remaining": 97,
    "breakdown": {
      "urldyn": 1,
      "article": 1,
      "form": 1
    }
  }
}
```

---

## 三、网址跳转码（urldyn）

### 3.1 创建网址跳转码

`POST /urldyn`

**需要登录**

**请求体**

```json
{
  "target_url": "https://example.com/page",
  "expires_in": 30
}
```

| 字段 | 类型 | 必填 | 校验规则 |
| ---- | ---- | ---- | ---- |
| `target_url` | string | 是 | 合法 http/https URL，最大 2048 字符 |
| `expires_in` | int | 是 | 有效天数，1–60，默认 30 |

**成功响应** `201`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 42,
    "code": "a2b3c4d5",
    "short_url": "https://xxx.com/u/a2b3c4d5",
    "target_url": "https://example.com/page",
    "expires_at": "2026-06-21T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40201 | 活码配额已满（已达 100 个上限） |
| 40001 | URL 格式不合法 |

---

### 3.2 查询我的网址跳转码列表

`GET /urldyn`

**需要登录**

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页条数，默认 20 |
| `status` | string | 否 | 筛选状态：`active` / `expired`，不传则返回全部 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 42,
        "code": "a2b3c4d5",
        "short_url": "https://xxx.com/u/a2b3c4d5",
        "target_url": "https://example.com/page",
        "status": "active",
        "expires_at": "2026-06-21T10:30:00Z",
        "created_at": "2026-05-22T10:30:00Z",
        "access_count": 128
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `status` | string | `active` 活跃 / `expiring_soon` 即将过期（≤3天） / `expired` 已过期 |
| `access_count` | int | 累计访问次数 |

---

### 3.3 查询单个网址跳转码详情

`GET /urldyn/:id`

**需要登录**，仅可查询自己创建的。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 42,
    "code": "a2b3c4d5",
    "short_url": "https://xxx.com/u/a2b3c4d5",
    "target_url": "https://example.com/page",
    "status": "active",
    "expires_at": "2026-06-21T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z",
    "access_count": 128,
    "daily_stats": [
      { "date": "2026-05-20", "count": 45 },
      { "date": "2026-05-21", "count": 38 },
      { "date": "2026-05-22", "count": 12 }
    ]
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `daily_stats` | array | 最近 30 天每日访问统计 |

---

### 3.4 修改网址跳转码

`PUT /urldyn/:id`

**需要登录**，仅可修改自己创建的。已过期的不可修改。

**请求体**

```json
{
  "target_url": "https://example.com/new-page",
  "expires_in": 45
}
```

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `target_url` | string | 否 | 新的目标 URL，不传则不修改 |
| `expires_in` | int | 否 | 从当前时间起重新计算有效天数（1–60），不传则不修改 |

> 注意：`expires_in` 是从修改时刻起重新计算的，不是在原到期时间上叠加。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 42,
    "code": "a2b3c4d5",
    "short_url": "https://xxx.com/u/a2b3c4d5",
    "target_url": "https://example.com/new-page",
    "status": "active",
    "expires_at": "2026-07-06T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40301 | 资源不存在或不属于当前用户 |
| 40302 | 资源已过期，不可修改 |
| 40001 | URL 格式不合法 |

---

### 3.5 删除网址跳转码

`DELETE /urldyn/:id`

**需要登录**，仅可删除自己创建的。删除后释放配额。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40301 | 资源不存在或不属于当前用户 |

---

## 四、文章（article）

### 4.1 创建文章

`POST /article`

**需要登录**

**请求体**

```json
{
  "title": "文章标题",
  "content": "<p>文章 HTML 内容</p>",
  "attachments": [
    {
      "key": "uploads/2026/05/abc123.jpg",
      "type": "image",
      "name": "photo.jpg",
      "size": 2048000
    }
  ],
  "expires_in": 30
}
```

| 字段 | 类型 | 必填 | 校验规则 |
| ---- | ---- | ---- | ---- |
| `title` | string | 是 | 最大 200 字符 |
| `content` | string | 是 | TipTap 输出的 HTML，正文字数上限 50,000 字 |
| `attachments` | array | 否 | 附件列表，详见下方约束 |
| `expires_in` | int | 是 | 有效天数，1–60 |

**附件约束**

| 类型 | `type` 值 | 单文件大小上限 | 数量限制 |
| ---- | --------- | ------------- | -------- |
| 图片 | `image` | 5 MB | 无上限 |
| 视频 | `video` | 50 MB | 视频与通用文件之和最多 1 |
| 音频 | `audio` | 20 MB | 无上限 |
| 通用文件 | `file` | 50 MB | 视频与通用文件之和最多 1 |

禁止上传的扩展名：`.exe` `.bat` `.js` `.php` `.py`

**附件对象**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `key` | string | MinIO 对象键，由上传接口返回 |
| `type` | string | `image` / `video` / `audio` / `file` |
| `name` | string | 原始文件名 |
| `size` | int | 文件大小（字节） |

**成功响应** `201`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 7,
    "code": "x9y8z7w6",
    "short_url": "https://xxx.com/a/x9y8z7w6",
    "title": "文章标题",
    "status": "active",
    "expires_at": "2026-06-21T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40201 | 活码配额已满 |
| 40001 | 内容超长、附件违规等 |

---

### 4.2 查询我的文章列表

`GET /article`

**需要登录**

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页条数，默认 20 |
| `status` | string | 否 | `active` / `expired` |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 7,
        "code": "x9y8z7w6",
        "short_url": "https://xxx.com/a/x9y8z7w6",
        "title": "文章标题",
        "status": "active",
        "expires_at": "2026-06-21T10:30:00Z",
        "created_at": "2026-05-22T10:30:00Z",
        "access_count": 56
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 4.3 查询单个文章详情

`GET /article/:id`

**需要登录**，仅可查询自己创建的。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 7,
    "code": "x9y8z7w6",
    "short_url": "https://xxx.com/a/x9y8z7w6",
    "title": "文章标题",
    "content": "<p>文章 HTML 内容</p>",
    "attachments": [
      {
        "key": "uploads/2026/05/abc123.jpg",
        "type": "image",
        "name": "photo.jpg",
        "size": 2048000,
        "url": "https://minio.xxx.com/bucket/uploads/2026/05/abc123.jpg?X-Amz-..."
      }
    ],
    "status": "active",
    "expires_at": "2026-06-21T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z",
    "access_count": 56,
    "daily_stats": [
      { "date": "2026-05-20", "count": 20 },
      { "date": "2026-05-21", "count": 25 },
      { "date": "2026-05-22", "count": 11 }
    ]
  }
}
```

> `attachments[].url` 为 MinIO 预签名 URL，有时效（默认 1 小时）。

---

### 4.4 修改文章

`PUT /article/:id`

**需要登录**，仅可修改自己创建的。已过期的不可修改。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `title` | string | 否 | 不传则不修改 |
| `content` | string | 否 | 不传则不修改 |
| `attachments` | array | 否 | 不传则不修改；传则整体替换附件列表 |
| `expires_in` | int | 否 | 从当前时间起重新计算，1–60 |

请求体格式同创建。替换附件列表时，未保留的旧附件资源由后台异步清理。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 7,
    "code": "x9y8z7w6",
    "short_url": "https://xxx.com/a/x9y8z7w6",
    "title": "修改后的标题",
    "status": "active",
    "expires_at": "2026-07-06T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40401 | 资源不存在或不属于当前用户 |
| 40402 | 资源已过期，不可修改 |
| 40001 | 内容超长、附件违规等 |

---

### 4.5 删除文章

`DELETE /article/:id`

**需要登录**，仅可删除自己创建的。删除后释放配额，附件资源由后台异步清理。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40401 | 资源不存在或不属于当前用户 |

---

## 五、表单（form）

### 5.1 创建表单

`POST /form`

**需要登录**

**请求体**

```json
{
  "title": "用户反馈表",
  "fields": [
    {
      "id": "f1",
      "type": "text",
      "label": "姓名",
      "required": true,
      "props": {}
    },
    {
      "id": "f2",
      "type": "radio",
      "label": "性别",
      "required": true,
      "props": {
        "options": ["男", "女"]
      }
    },
    {
      "id": "f3",
      "type": "rating",
      "label": "评分",
      "required": false,
      "props": {
        "max": 5
      }
    }
  ],
  "max_submissions": 1000,
  "deadline": "2026-06-30T23:59:59Z",
  "expires_in": 30
}
```

| 字段 | 类型 | 必填 | 校验规则 |
| ---- | ---- | ---- | ---- |
| `title` | string | 是 | 最大 200 字符 |
| `fields` | array | 是 | 字段配置数组，最少 1 个字段，最多 50 个 |
| `max_submissions` | int | 否 | 提交数量上限，`null` 或不传表示无限制 |
| `deadline` | string | 否 | 截止时间（ISO 8601），`null` 或不传表示不限制 |
| `expires_in` | int | 是 | 有效天数，1–60 |

**字段类型及 props**

| type | label | props | 必填 props |
| ---- | ----- | ----- | ---------- |
| `text` | 单行文本 | `{ "placeholder": "..." }` | 无 |
| `textarea` | 多行文本 | `{ "placeholder": "...", "max_length": 500 }` | 无 |
| `radio` | 单选 | `{ "options": ["A", "B"] }` | `options`（至少 2 项） |
| `checkbox` | 多选 | `{ "options": ["A", "B", "C"] }` | `options`（至少 2 项） |
| `select` | 下拉 | `{ "options": ["A", "B"] }` | `options`（至少 2 项） |
| `date` | 日期 | `{ "format": "YYYY-MM-DD" }` | 无 |
| `file` | 文件上传 | `{ "max_size": 10485760, "accept": ".jpg,.png,.pdf" }` | 无 |
| `rating` | 评分 | `{ "max": 5 }` | 无 |

**字段对象**

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 字段唯一标识，前端生成，建议 `f` + 递增数字 |
| `type` | string | 字段类型 |
| `label` | string | 字段标签，最大 100 字符 |
| `required` | bool | 是否必填 |
| `props` | object | 字段类型特定配置 |

**成功响应** `201`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 15,
    "code": "m3n4o5p6",
    "short_url": "https://xxx.com/f/m3n4o5p6",
    "title": "用户反馈表",
    "status": "active",
    "expires_at": "2026-06-21T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40201 | 活码配额已满 |
| 40001 | 字段配置不合法 |

---

### 5.2 查询我的表单列表

`GET /form`

**需要登录**

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页条数，默认 20 |
| `status` | string | 否 | `active` / `expired` |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 15,
        "code": "m3n4o5p6",
        "short_url": "https://xxx.com/f/m3n4o5p6",
        "title": "用户反馈表",
        "status": "active",
        "submission_count": 42,
        "max_submissions": 1000,
        "deadline": "2026-06-30T23:59:59Z",
        "expires_at": "2026-06-21T10:30:00Z",
        "created_at": "2026-05-22T10:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

---

### 5.3 查询单个表单详情

`GET /form/:id`

**需要登录**，仅可查询自己创建的。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 15,
    "code": "m3n4o5p6",
    "short_url": "https://xxx.com/f/m3n4o5p6",
    "title": "用户反馈表",
    "fields": [ ... ],
    "max_submissions": 1000,
    "deadline": "2026-06-30T23:59:59Z",
    "status": "active",
    "submission_count": 42,
    "access_count": 200,
    "expires_at": "2026-06-21T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z",
    "daily_stats": [
      { "date": "2026-05-20", "count": 70 },
      { "date": "2026-05-21", "count": 80 },
      { "date": "2026-05-22", "count": 50 }
    ]
  }
}
```

---

### 5.4 修改表单

`PUT /form/:id`

**需要登录**，仅可修改自己创建的。已过期的不可修改。

**请求体**

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `title` | string | 否 | 不传则不修改 |
| `fields` | array | 否 | 不传则不修改；传则整体替换字段配置 |
| `max_submissions` | int | 否 | 不传则不修改，`null` 表示改为无限制 |
| `deadline` | string | 否 | 不传则不修改，`null` 表示取消截止时间 |
| `expires_in` | int | 否 | 从当前时间起重新计算，1–60 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 15,
    "code": "m3n4o5p6",
    "short_url": "https://xxx.com/f/m3n4o5p6",
    "title": "修改后的标题",
    "status": "active",
    "expires_at": "2026-07-06T10:30:00Z",
    "created_at": "2026-05-22T10:30:00Z"
  }
}
```

> 修改字段配置不影响已有提交数据，已有提交按旧字段结构存储。

**错误码**

| code | 说明 |
| ---- | ---- |
| 40501 | 资源不存在或不属于当前用户 |
| 40502 | 资源已过期，不可修改 |
| 40001 | 字段配置不合法 |

---

### 5.5 删除表单

`DELETE /form/:id`

**需要登录**，仅可删除自己创建的。删除后释放配额，提交数据由后台异步清理。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40501 | 资源不存在或不属于当前用户 |

---

### 5.6 查询表单提交列表

`GET /form/:id/submissions`

**需要登录**，仅可查询自己创建的表单。

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页条数，默认 20 |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 301,
        "values": {
          "f1": "张三",
          "f2": "男",
          "f3": 4
        },
        "submitted_at": "2026-05-22T08:15:00Z"
      }
    ],
    "total": 42,
    "page": 1,
    "page_size": 20
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `values` | object | 键为字段 id，值为提交内容；`file` 类型值为 MinIO 预签名 URL |
| `submitted_at` | string | 提交时间 |

---

### 5.7 导出表单提交数据

`GET /form/:id/submissions/export`

**需要登录**，仅可导出自己创建的表单。

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `format` | string | 是 | `csv` 或 `xlsx` |

**成功响应**

- `format=csv`：`Content-Type: text/csv; charset=utf-8`，`Content-Disposition: attachment; filename="form_15.csv"`
- `format=xlsx`：`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，`Content-Disposition: attachment; filename="form_15.xlsx"`

直接返回文件流，不包装在通用 JSON 响应中。

**错误码**

| code | 说明 |
| ---- | ---- |
| 40501 | 资源不存在或不属于当前用户 |
| 40001 | format 参数不合法 |

---

## 六、表单提交（匿名，无需登录）

### 6.1 获取表单配置（公开）

`GET /public/form/:code`

**无需登录**

访问者通过短链接打开表单时调用，返回表单渲染所需配置。

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "title": "用户反馈表",
    "fields": [ ... ],
    "max_submissions": 1000,
    "submission_count": 42,
    "deadline": "2026-06-30T23:59:59Z"
  }
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40503 | 表单不存在或已过期 |
| 40504 | 表单已停止收集（达到提交上限或超过截止时间） |

---

### 6.2 提交表单（公开）

`POST /public/form/:code/submit`

**无需登录**，匿名提交。

**请求体**

```json
{
  "values": {
    "f1": "张三",
    "f2": "男",
    "f3": 4
  }
}
```

| 字段 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `values` | object | 是 | 键为字段 id，值为提交内容；`file` 类型值为上传后返回的 `key` |

**成功响应** `201`

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

**错误码**

| code | 说明 |
| ---- | ---- |
| 40503 | 表单不存在或已过期 |
| 40504 | 表单已停止收集 |
| 40001 | 必填字段未填写、字段值格式不正确 |
| 40505 | 提交过于频繁（同一 IP 限 10 秒 1 次） |

---

## 七、文件上传

### 7.1 上传文件

`POST /upload`

**需要登录**

用于文章附件和表单文件上传字段。文件存储在 MinIO。

**请求**

- `Content-Type: multipart/form-data`
- 字段名：`file`
- 额外参数：`purpose`（`article` / `form`）

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `file` | file | 是 | 上传的文件 |
| `purpose` | string | 是 | `"article"` 文章附件 / `"form"` 表单附件 |

**大小限制（按 purpose + 类型）**

| purpose | 类型 | 上限 |
| ------- | ---- | ---- |
| article | image | 5 MB |
| article | video | 50 MB |
| article | audio | 20 MB |
| article | file | 50 MB |
| form | file | 10 MB |

> 服务端根据文件扩展名推断类型并校验大小。

**禁止的扩展名**：`.exe` `.bat` `.js` `.php` `.py`

**成功响应** `201`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "key": "uploads/2026/05/abc123.jpg",
    "name": "photo.jpg",
    "size": 2048000,
    "type": "image",
    "url": "https://minio.xxx.com/bucket/uploads/2026/05/abc123.jpg?X-Amz-..."
  }
}
```

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `key` | string | MinIO 对象键，创建/修改文章时填入 `attachments[].key` |
| `url` | string | 预签名 URL，1 小时有效，用于即时预览 |

**错误码**

| code | 说明 |
| ---- | ---- |
| 40601 | 文件大小超限 |
| 40602 | 文件类型被禁止 |
| 40603 | 上传失败（MinIO 异常） |

---

## 八、短链接跳转（公开）

以下接口为短链接访问时的后端行为，返回 HTTP 重定向或页面内容。

### 8.1 网址跳转码

`GET /u/:code`

**无需登录**

- 有效且未过期：`302 Redirect` → 目标 URL，同时记录访问统计
- 已过期：返回 `410 Gone`，展示过期页面
- 不存在：返回 `404 Not Found`

安全检查：
- 目标 URL 须为 `http` / `https` 协议
- 防止开放重定向（不允许跳转到自身域名）
- 防止 JavaScript 协议注入

---

### 8.2 文章

`GET /a/:code`

**无需登录**

- 有效且未过期：返回文章渲染页面（SSR 或前端路由加载后调用 API 获取内容）
- 已过期：返回 `410 Gone`，展示过期页面
- 不存在：返回 `404 Not Found`

前端渲染文章详情时的数据接口：

`GET /public/article/:code`

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "title": "文章标题",
    "content": "<p>文章 HTML 内容</p>",
    "attachments": [
      {
        "type": "image",
        "name": "photo.jpg",
        "url": "https://minio.xxx.com/bucket/uploads/2026/05/abc123.jpg?X-Amz-..."
      }
    ]
  }
}
```

> 内容中的 HTML 需经后端 XSS 清洗后存储，前端渲染时仍须使用安全方式（如 DOMPurify）。

---

### 8.3 表单

`GET /f/:code`

**无需登录**

- 有效且未过期：重定向到表单填写页面（前端路由 `/form/fill/:code`）
- 已过期：返回 `410 Gone`，展示过期页面
- 不存在：返回 `404 Not Found`

表单数据获取见 [6.1 获取表单配置](#61-获取表单配置公开)。

---

## 九、全局活码列表

### 9.1 查询我的所有活码

`GET /codes`

**需要登录**

跨类型（urldyn / article / form）查询当前用户的所有活码。

**查询参数**

| 参数 | 类型 | 必填 | 说明 |
| ---- | ---- | ---- | ---- |
| `page` | int | 否 | 页码，默认 1 |
| `page_size` | int | 否 | 每页条数，默认 20 |
| `type` | string | 否 | 筛选类型：`urldyn` / `article` / `form`，不传则返回全部 |
| `status` | string | 否 | `active` / `expired`，不传则返回全部 |
| `keyword` | string | 否 | 搜索关键词，匹配标题/目标 URL |

**成功响应** `200`

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "list": [
      {
        "id": 42,
        "type": "urldyn",
        "code": "a2b3c4d5",
        "short_url": "https://xxx.com/u/a2b3c4d5",
        "title": null,
        "target_url": "https://example.com/page",
        "status": "active",
        "expires_at": "2026-06-21T10:30:00Z",
        "created_at": "2026-05-22T10:30:00Z",
        "access_count": 128
      },
      {
        "id": 7,
        "type": "article",
        "code": "x9y8z7w6",
        "short_url": "https://xxx.com/a/x9y8z7w6",
        "title": "文章标题",
        "target_url": null,
        "status": "active",
        "expires_at": "2026-06-21T10:30:00Z",
        "created_at": "2026-05-22T10:30:00Z",
        "access_count": 56
      }
    ],
    "total": 2,
    "page": 1,
    "page_size": 20
  }
}
```

> `title` 仅 article / form 有值，urldyn 为 `null`；`target_url` 仅 urldyn 有值。

---

## 十、接口总览

| 方法 | 路径 | 认证 | 说明 |
| ---- | ---- | ---- | ---- |
| POST | `/auth/register` | 否 | 注册 |
| POST | `/auth/login` | 否 | 登录 |
| POST | `/auth/verify-code` | 否 | 发送邮箱验证码 |
| POST | `/auth/reset-password` | 否 | 找回密码 |
| POST | `/auth/change-password` | 是 | 修改密码 |
| POST | `/auth/refresh` | 否 | 续签 Token |
| GET | `/auth/me` | 是 | 获取当前用户信息 |
| GET | `/user/quota` | 是 | 查询配额 |
| POST | `/urldyn` | 是 | 创建网址跳转码 |
| GET | `/urldyn` | 是 | 我的网址跳转码列表 |
| GET | `/urldyn/:id` | 是 | 网址跳转码详情 |
| PUT | `/urldyn/:id` | 是 | 修改网址跳转码 |
| DELETE | `/urldyn/:id` | 是 | 删除网址跳转码 |
| POST | `/article` | 是 | 创建文章 |
| GET | `/article` | 是 | 我的文章列表 |
| GET | `/article/:id` | 是 | 文章详情 |
| PUT | `/article/:id` | 是 | 修改文章 |
| DELETE | `/article/:id` | 是 | 删除文章 |
| POST | `/form` | 是 | 创建表单 |
| GET | `/form` | 是 | 我的表单列表 |
| GET | `/form/:id` | 是 | 表单详情 |
| PUT | `/form/:id` | 是 | 修改表单 |
| DELETE | `/form/:id` | 是 | 删除表单 |
| GET | `/form/:id/submissions` | 是 | 表单提交列表 |
| GET | `/form/:id/submissions/export` | 是 | 导出提交数据 |
| POST | `/upload` | 是 | 上传文件 |
| GET | `/codes` | 是 | 我的所有活码列表 |
| GET | `/u/:code` | 否 | 短链接跳转（网址） |
| GET | `/a/:code` | 否 | 短链接跳转（文章） |
| GET | `/f/:code` | 否 | 短链接跳转（表单） |
| GET | `/public/article/:code` | 否 | 公开文章内容 |
| GET | `/public/form/:code` | 否 | 公开表单配置 |
| POST | `/public/form/:code/submit` | 否 | 提交表单 |
