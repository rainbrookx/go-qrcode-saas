# 新增功能记录

待实现或已完成的新功能列表，与 SRS/API 文档对照。

---

## 待实现

### 1. 前端表单提交数据 CSV/Excel 导出

- **来源**: SRS 3.3 节 — "支持导出 CSV / Excel"
- **后端状态**: 已实现 — `GET /form/:id/submissions/export`（API 5.7 节）
- **前端状态**: 缺失 — 表单管理页（`gqs-frontend/app/(main)/form/page.tsx`，`components/FormBuilder.tsx`）均无导出按钮或导出调用
- **影响**: 用户无法从 UI 导出表单提交数据，只能通过 API 工具手动调用接口
- **预期**: 在表单管理或提交数据查看界面增加"导出 CSV"/"导出 Excel"按钮，调用 `/form/:id/submissions/export` 并触发浏览器下载

### 2. 解码器增强 — 支持异形/彩色二维码

- **来源**: 用户反馈 — 当前解码仅支持标准黑白二维码，异形码、彩色码失效
- **当前状态**: 使用 `jsqr` 库，直接读取原始像素无预处理（`components/QRDecoder.tsx` 第 6、34 行）
- **问题**: 缺少灰度化、自适应二值化、多次阈值/反转尝试等预处理管线，对低对比度、非标准模块的二维码解码能力弱
- **方案**: 替换为 `qr-scanner`（基于 `jsqr` + 预处理管线），安装命令 `pnpm add qr-scanner`
- **备选**: `@zxing/library` — 更强但体积大、API 复杂
- **影响文件**: `gqs-frontend/components/QRDecoder.tsx`

### 3. 【我的活码】缺少二维码生成入口

- **来源**: 用户反馈 — 列表中每条记录只展示短链接，无法直接生成对应二维码
- **当前状态**: `CodeList.tsx` 第 79–83 行将 `short_url` 渲染为可点击链接，但无二维码生成按钮
- **已有可用组件**: `components/QRPreview.tsx` — 接收 `value` prop 即可渲染二维码并支持下载 PNG
- **预期**: 在操作列或展开行中增加"二维码"按钮，点击弹出 Modal 内嵌 `QRPreview`，传入 `short_url` 作为 value
- **影响文件**: `gqs-frontend/components/CodeList.tsx`

### 4. 【我的活码】缺少多选删除

- **来源**: 用户反馈 — 仅支持逐行删除，无法批量操作
- **当前状态**: `CodeList.tsx` 第 121–123 行仅提供单行 `Popconfirm` 删除按钮
- **后端支持**: `DELETE /urldyn/:id`、`DELETE /article/:id`、`DELETE /form/:id` 均已实现
- **预期**: Table 增加 `rowSelection`，顶部工具栏增加"批量删除"按钮，调用对应删除接口
- **影响文件**: `gqs-frontend/components/CodeList.tsx`

### 5. 【我的活码】编辑按钮 404 — 缺少编辑页路由

- **来源**: 用户反馈 — 点击编辑按钮跳转 404
- **当前状态**: `CodeList.tsx` 第 119 行 `router.push(\`/${r.type}/${r.id}\`)` 生成路由如 `/urldyn/123`，但 Next.js 无对应路由文件（仅存在 `app/(main)/urldyn/page.tsx` 等列表/创建页，无 `[id]` 动态段）
- **后端支持**: `GET /urldyn/:id`、`PUT /urldyn/:id` 等详情和更新接口均已实现
- **预期**: 创建 `app/(main)/urldyn/[id]/page.tsx`、`app/(main)/article/[id]/page.tsx`、`app/(main)/form/[id]/page.tsx` 编辑页，通过 `GET /:type/:id` 回填表单数据，提交时调用 `PUT /:type/:id`
- **影响文件**: 新增 3 个编辑页路由，可能复用现有 `UrlDynForm`、`ArticleEditor`、`FormBuilder` 组件

### 6. 缺少用户个人中心 — 查看信息、修改密码

- **来源**: 用户反馈 — 无个人信息查看入口，无法修改密码
- **当前状态**:
  - Header 用户下拉（`components/Header.tsx` 第 82–91 行）仅含"我的活码"和"退出登录"，无个人中心入口
  - `GET /auth/me` 返回 id、email、created_at、active_code_count，但前端无页面展示
  - `POST /auth/change-password` 已实现，无前端表单
- **影响**: 用户无法查看注册邮箱、注册时间、配额使用量，也无法自行修改密码
- **预期**: 新建个人中心页面，包含：
  - 个人信息区：调用 `GET /auth/me` 展示邮箱、注册时间、活码配额用量
  - 修改密码区：表单调用 `POST /auth/change-password`（旧密码 + 新密码 + 确认新密码）
- **影响文件**: 新增 `app/(main)/profile/page.tsx`；Header 下拉菜单增加"个人中心"入口
