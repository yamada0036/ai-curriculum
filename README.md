# 人工智能专业课程管理系统

从《2025版人工智能专业培养方案（修改第九版）》第十二部分导入 72 门具体课程，并独立保留公共选修的三个方向和共享要求。

## 功能

- 课程新增、详情查询、编辑、删除和回收站恢复
- 按名称、编码、关键词、类别、性质和学期搜索筛选
- 八学期周学时视图、学分及学时统计
- 公共选修和专业任选最低要求编辑
- CSV 导出当前筛选课程，JSON 备份全部数据和修读要求
- 登录账户隔离、数据库持久化、服务端校验和版本冲突保护

## 数据口径

61 门必修课合计 126.5 学分。公共选修共需 8 学分、128 学时；三个方向不能分别累计。专业任选需至少 13 学分，课程库提供 11 门任选课程。按最低要求汇总为 147.5 学分、2472 学时；全部具体课程为 153.5 学分、2568 学时。两者统计口径不同。

原表未填写的理论或实践学时保留 null，原表 0 保留 0。学期安排列为周学时，不能直接当成总学时。第十三部分集中性实践教学不在本次导入范围。

`data/seed.json` 保存已校验的初始数据；`data/source-table.json` 保存第十二部分展开合并单元格后的原表，用于核对。完整原文档未纳入站点。首次登录会按账号初始化；删除记录不会触发重新导入。

## 本地运行

需要 Node.js 22.13 或更新版本。安装依赖后运行 `npm run build`，然后根据 `drizzle/` 顺序执行尚未应用的数据库迁移：

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_vengeful_darkstar.sql
npm run dev -- --port 5173
```

本地登录入口 `/signin-with-chatgpt?return_to=/` 使用开发模拟身份。发布环境使用 Sites 提供的真实登录和私有访问。数据保存在 Cloudflare D1，不依赖浏览器缓存。

## 校验

`node scripts/extract-courses.mjs` 从本地提取中间文件生成初始数据，并检查 72 门课程、编码唯一性、学时分配、必修学分和原表总量。中间文件包含原文其他章节，因此不纳入版本管理。

`node node_modules/typescript/bin/tsc --noEmit` 检查类型；`npm run build` 生成生产构建。
