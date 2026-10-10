# 资源与开发者页面：设计与 SEO 验收

日期：2026-10-10。设计基准：[网站设计规范](./design-system.md)。

## 已完成范围

- Blog、Guides、周报、月报、年度研究报告、Docs、Agent Entry、API、CLI 接入共享资源外壳。
- 指南详情、博客用例详情沿用各自内容结构，统一标题、控件、卡片、面包屑和相关链接。
- 历史博客接入 ArticleLayout，使用 Markdown/GFM 解析器，区分文章发布方与 Skill 作者，保留代码和表格的独立滚动。
- 已存在的七种非英文 Docs/API 页面接入同一外壳；语言入口仍只在站点导航。
- Skills 目录、主页、数据库及 Skill 发布流程未改动。

## SEO 与内容准确性

- 资源页各自的 title、description、canonical、Open Graph、Twitter 信息由共享定义生成，避免继承主页的分享 URL/标题。
- 可见面包屑与 BreadcrumbList 对应；入口提供 CollectionPage/WebPage，保留已有 Article、FAQ 和研究 Dataset/Report。
- 英文 Docs/API 补齐与真实译文互相对应的 hreflang；未翻译的页不声明不存在的译文。
- Docs、API、CLI 提供可抓取的章节锚点；资源间有服务端输出的相关链接。
- 历史 Markdown 不执行原始 HTML，不把正文一级标题输出成第二个页面 H1，保留安全链接。
- 指南首页移除读取 1,200 条数据库记录的无关统计请求，展示真实的指南目录数量。
- 报告注明生成时间、抽样范围和列表截断；累计事件不再让读者误解为当周/月新增量。

## 检查

- 完整回归测试通过；新增资源 metadata、真实语言链接、JSON-LD 转义、Markdown 标题及内容安全回归。
- Typecheck 通过。Lint：0 error，25 条已有 warning。
- 生产构建通过。
- `check:resource-pages` 检查 26 个实际页面：HTTP 200、服务端 H1、canonical、OG URL、Twitter、JSON-LD、语言链接和章节目标。
- 浏览器检查 13 类页面 × 320/390/768/1440px，共 52 组；无整页横向溢出，H1 数量与字重正确。
- 实际操作移动端 API 章节跳转和导航语言选择；桌面与手机截图核对指南、文档、API 及历史博客。

## 独立的运行限制

本地生产构建的数据读取出现 Supabase `exceed_egress_quota`，数据服务提示项目受出站流量配额限制。当前线上博客入口、已有文章与 Agent API 仍可返回内容，但这不能证明实时数据库查询已恢复。网站现有静态内容、缓存或降级路径可以继续提供部分页面；它们不等于最新的全量数据。

本次未修改账单、套餐或支出上限。配额限制应在 Supabase 控制台单独处理；前端设计及元信息优化无法解除账户限制，也不能保证 Google 收录。[Supabase 出站用量说明](https://supabase.com/docs/guides/platform/manage-your-usage/egress)。
