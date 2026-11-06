# 人工智能专业课程管理系统

从《2025版人工智能专业培养方案（修改第九版）》第十二部分导入 72 门具体课程，并独立保留公共选修的三个方向和共享要求。

## 功能

- 课程新增、详情查询、编辑、删除和回收站恢复
- 按名称、编码、关键词、类别、性质和学期搜索筛选
- 八学期周学时视图、学分及学时统计
- 公共选修和专业任选最低要求编辑
- CSV 导出当前筛选课程，JSON 备份全部数据和修读要求
- 所有人无需登录即可查看同一份课程数据；管理员登录后可增删改
- Vercel Blob 私有文件持久化、服务端权限校验和并发版本冲突保护
- 导入旧版 JSON 备份，可迁移此前在 Sites 中修改的数据

## 数据口径

61 门必修课合计 126.5 学分。公共选修共需 8 学分、128 学时；三个方向不能分别累计。专业任选需至少 13 学分，课程库提供 11 门任选课程。按最低要求汇总为 147.5 学分、2472 学时；全部具体课程为 153.5 学分、2568 学时。两者统计口径不同。

原表未填写的理论或实践学时保留 null，原表 0 保留 0。学期安排列为周学时，不能直接当成总学时。第十三部分集中性实践教学不在本次导入范围。

`data/seed.json` 保存已校验的初始数据；`data/source-table.json` 保存第十二部分展开合并单元格后的原表，用于核对。完整原文档未纳入站点。所有访问者读取同一份课程数据；删除记录不会触发重新导入。无需部署 MySQL、PostgreSQL、SQLite 或 Cloudflare D1。

## GitHub → Vercel 部署

1. 在 Vercel 导入此 GitHub 仓库，选择 **Next.js**，Root Directory 保持仓库根目录。
2. Build Command 使用 `npm run build`，Install Command 使用 `npm ci`，Output Directory 使用 Next.js 默认值 `.next`。仓库的 `vercel.json` 已固定这些设置。
3. 在项目 Storage 中创建一个 **Private Blob** 存储并连接到项目。采用 `BLOB_STORE_ID` + Vercel OIDC 或由连接过程注入的 `BLOB_READ_WRITE_TOKEN`，二者均受支持。不需要配置关系数据库。
4. 在本机执行 `npm run setup:admin`。管理员密码和环境变量写入被 Git 忽略的 `private/admin-setup.txt`，不会打印到终端。
5. 将该文件中的 `ADMIN_PASSWORD_HASH` 和 `SESSION_SECRET` 填入 Vercel 项目的 Environment Variables，类型设为 Secret，选择 Production。管理员实际密码只由本人保管，不能放进 GitHub 或 `NEXT_PUBLIC_*` 变量。
6. 重新部署，在页面右上角点击“管理员登录”。访客可直接查看课程、筛选和导出；只有管理员可保存、删除、恢复和导入。

没有配置 Blob 时，页面以只读方式显示初始 72 门课程，不会假装保存成功。配置错误或已有数据损坏时会报错，不会以初始数据覆盖现有文件。Vercel 预览分支使用独立文件路径，不修改生产数据；需要在 Preview 中编辑时，为该环境单独设置管理员配置并连接 Blob。

### 修复 routes-manifest.json 缺失

此版本的 `npm run build` 执行 **`next build`**，会生成 `.next/routes-manifest.json`。早期 Sites 版本执行 Vinext，输出到 `dist/`，无法被 Vercel 的 Next.js 部署流程识别。不要把 Vercel 的输出目录设置成 `dist`，也不要再使用旧的 `scripts/run-framework.mjs build`。

若 Vercel 仍报相同错误，请确认部署使用最新 GitHub 提交，并取消项目设置中的旧 Build Command / Output Directory 覆盖后重新部署。

### 迁移已有数据

若在原 Sites 站点修改过课程，先从原站点“修读要求”导出完整 JSON 备份；新站点管理员登录后，在同一页面点击“导入旧版备份”。导入前可先导出新站点备份。导入会验证格式、编码唯一性与版本，替换当前课程和修读要求。

### 保存与管理

课程数据保存在私有 Blob JSON 文件中，访客通过服务端接口读取有效课程，已删除课程只提供给管理员。保存使用 ETag 条件写入，检测并发覆盖；读取绕过旧缓存。生产默认文件路径为 `curriculum/production.json`，也可用 `CURRICULUM_BLOB_PATH` 指定独立路径。

管理员会话最长 8 小时，使用 HttpOnly Cookie；Vercel 上启用 Secure 和 SameSite=Strict。修改管理员密码哈希或会话密钥会撤销现有会话。登录接口有单实例辅助频率限制；如需统一的全局限流，可在 Vercel Firewall 中针对 `/api/auth/login` 配置。

## 本地运行

需要 Node.js 22.13 或更新版本：

```powershell
npm ci
npm run build
npm start
```

打开 `http://localhost:3000`。不配置环境变量也能查看初始课程。需要编辑时，按 `.env.example` 配置 `.env.local`；本地 OIDC 需要 Vercel 项目绑定和有效令牌，或使用属于测试存储的读写令牌。本地默认写入 `curriculum/local.json`。不要将本地配置指向生产文件进行测试。

## 校验

`node scripts/extract-courses.mjs` 从本地提取中间文件生成初始数据，并检查 72 门课程、编码唯一性、学时分配、必修学分和原表总量。中间文件包含原文其他章节，因此不纳入版本管理。

`npm test` 校验课程操作、数据口径、版本冲突和登录安全逻辑；`npm run typecheck` 检查类型；`npm run build` 生成生产构建。`node scripts/test-vercel-http.mjs` 在独立本地生产服务中检查公开访问、管理员登录、写权限和缺少存储时的错误行为，使用临时测试会话配置，不连接真实 Blob。

仓库保留的 `worker/`、`db/`、`drizzle/`、`.openai/` 和旧 Sites 工具文件不参与 Vercel 运行。当前运行入口只使用标准 Next.js App Router 与 Blob 存储。
