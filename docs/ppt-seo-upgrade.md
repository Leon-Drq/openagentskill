# PPT 专题 SEO 升级

目标市场：美国 / 英语。主目标查询：`ppt skills`。目标是提升相关性、选型价值和自然搜索曝光；不能保证超过某个竞品的 Google 排名。

## 页面分工

| 网址 | 用户问题 | 核心内容 | 候选数 |
| --- | --- | --- | --- |
| `/best/presentation-generation` | 哪个 PPT Skill 适合我？ | PPTX / 图片型 PPTX / HTML 总选型、比较表、来源、作者案例 | 7 |
| `/best/ppt-generation` | 如何得到真正可编辑的 PowerPoint？ | 原生生成、浏览器导出、截图重建的区别及对象编辑验收 | 3 |
| `/best/codex-presentation-decks` | 如何在 Codex 中完成演示任务？ | 5 种工作流选择、准备输入、样张、导出与验收、正确调用方式 | 5 |
| `/best/workbuddy-ppt-skills` | WorkBuddy 做 PPT 应用哪个 Skill？ | 原生 PPTX / Office 技能、启用与输入说明、Dashi 的 WorkBuddy 支持及导出检查 | 1 个社区候选，另有原生技能指南 |
| `/best/trae-ppt-skills` | 如何在 Trae 中安装并制作 PPT？ | TraeCode 导入完整技能包、项目/全局作用域、PPT Master 的本地运行条件 | 1 |
| `/best/doubao-ppt-skills` | 豆包办公模式如何使用 PPT Skill？ | Dashi 的办公模式限定、Node.js / 浏览器导出条件及 PowerPoint 验收 | 1 |
| `/best/cursor-ppt-skills` | Cursor 中选择哪种 PPT 输出？ | 技能发现与调用、本地工具要求、原生 PPTX / 浏览器导出 / HTML 区分 | 3 |
| `/best/codebuddy-ppt-skills` | CodeBuddy IDE 如何做 PPT？ | 腾讯官方 PPT 写作流程、PPT Master 及公司模板路径，区别于 WorkBuddy | 1 |

保留三个现有网址及各自规范网址，新增五个客户端专题；不在缺少历史曝光与外链数据时贸然重定向。页面候选、正文、FAQ 和搜索摘要各有分工，并互相链接。

## WorkBuddy 覆盖

主专题采用跨 Agent 定位，正文和 Agent 入口覆盖 Codex、Claude Code、WorkBuddy。增加 `WorkBuddy PPT skills` 独立页面和 sitemap 入口，回答原生技能与社区包如何选择的问题。

- 原生路径：腾讯官方的 [PPTX / Office 文档技能指南](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/WorkBuddy-Zero-Cost-Skill-Top-10/Office-Document-Suite)、[技能管理](https://www.codebuddy.ai/docs/zh/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market)及[文档生成案例](https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Practice-Cases/Practice-Two)。Office 指南通过腾讯 CDN 的同路径页面读取；对外链接保留官方站点入口。原生能力不作为新增 GitHub 收录或本站实测记录。
- 社区路径：Dashi 的固定版本 README 明确列出 WorkBuddy 支持，页面链接到这项说明，并保留本地 Node.js / 浏览器依赖和导出检查。导出组件有独立专有许可条款，与仓库主体 AGPL-3.0 分开标明。
- Guizang 的固定版本 README 标明 WorkBuddy 仍在适配，不加入 WorkBuddy 支持候选。其他包没有核对到 WorkBuddy 支持时，也不自动标记通用兼容。
- 比较表新增 Agent 支持信息；原生 WorkBuddy 技能与唯一已核对的社区候选分开计数。没有捏造官方包的仓库、开源许可、本站发布或运行成功。

## 国内及其他编程助手覆盖

主专题的七个 Agent 入口覆盖 Codex、Claude Code、WorkBuddy、Trae、豆包、Cursor 和 CodeBuddy IDE。目标市场仍为美国 / 英语；国内产品保留中文名称，Trae 与豆包指南增加中文示例简报。

- Trae：核对 [TraeCode 官方技能文档](https://docs.trae.cn/ide_skills)，使用完整包导入、启用和自然语言调用；注明中国版全局目录与 IDE / CLI 区别。PPT Master 的固定 README 明确列出 Trae；没有把通用格式支持说成本站安装实测。
- 豆包：Dashi 固定 README 明确要求办公模式。页面限定该条件，说明本地 Node.js 20+ 和浏览器需求；未发现通用安装命令时不编造目录或插件命令，不将普通聊天界面标成可执行。
- Cursor：核对 [官方 Agent Skills 文档](https://cursor.com/docs/skills)的发现与 slash picker 调用方式。PPT Master、Dashi、Guizang 分别有 Cursor 的作者说明，按输出格式给三项候选。
- CodeBuddy IDE：使用 [腾讯官方最佳实践中的 PPT 写作流程](https://www.codebuddy.cn/docs/ide/Best-practice/best-practice)和 PPT Master 作者说明；保留 IDE 与 WorkBuddy 各自的操作入口。
- 新增四页都有独立的标题、摘要、正文、FAQ、设置锚点和 sitemap 日期。官方文档描述、作者兼容声明与本站实际运行结果分开表达。

## 与竞品争取同一查询的方法

对标页面：[AgentSkillHub PPT 专题](https://agentskillshub.top/best/ppt-presentation/)。它用明确的 PPT 标题、输出分类与选型内容回答搜索者的问题。此前我们三个页面重复榜单、漏掉相关候选并混入 Deck.gl，这些是能直接修复的缺点；它们不能单独证明 Google 未展示网站的原因。

本轮争取优势的具体方式是：让用户先确定交付格式，再看逐项来源、可编辑边界、依赖、成本与验收方法。七个精选候选不是整个市场的数量，不用收录总数或 Star 数冒充输出质量。继续扩大候选前，先保证每项都能帮助用户完成选择。

## 执行顺序和时间

| 阶段 | 交付与动作 | 时间与依赖 |
| --- | --- | --- |
| P0：本轮升级 | 八个页面、选型对比、来源、内部链接、服务端正文与回归验证 | 本轮代码完成；以验收记录为准 |
| P1：发布与索引诊断 | 通过测试后同步 GitHub、发布生产版本；在 Search Console 检查八页的收录、规范网址和最后抓取 | 发布当天；Search Console 操作需站点权限 |
| P2：原创证据 | 用同一份真实简报比较 2–3 个工作流，展示导出文件、对象编辑结果和失败边界 | 有输入素材与运行环境后，预计 2–3 个工作日；这是工作量估计，本轮尚未运行 |
| P3：搜索复盘 | 按美国英语查询族与页面观察曝光、点击、CTR、平均排名，再调整内容和入口 | 上线后第 14 天、第 28 天；不是排名达标期限 |

P2 的测试文稿应成为可引用的原创内容；必须保留原文件和实际检查记录后才能写入页面。付费 API、作者外联与新工具安装的需求应先明确，不能用作者示例代替本站实测。

## 本轮实现

1. **修选品。** PPT 专题使用逐项核对的来源，不再从全站前 1,200 条截取。PPT Master、HTML PPT Studio 与 Image to Editable PPT 得到正确呈现；不将 Deck.gl 当作 PPT Skill。通用 use-case 匹配也拒绝仅包含 `deck` 的候选。
2. **补决策信息。** 每个候选标明交付格式、对象编辑能力、适用输入、Agent 设置、运行依赖、成本来源、许可与限制。支持能力来自所链接的源码版本，未声称安装或运行验证。
3. **加强内容。** 主专题提供 7 个候选的输出对比、4 个任务入口、7 个具体问答；子专题提供独立的 PPTX 验收、Codex 工作流程与 WorkBuddy 原生技能及社区选型指南。复用已有作者 HTML 案例，附准确来源标签。
4. **改内部入口。** 桌面与手机导航的 PPT / Slides 入口直接到主专题；目录筛选仍保留原有行为。Use-case 页和 `/best` 入口连接到新选型内容。
5. **SEO 基础。** 八页独立标题、摘要、自指规范网址、index/follow、服务端正文、CollectionPage / ItemList / BreadcrumbList。Sitemap 的 lastmod 使用此次真实编辑日期，不随请求刷新。
6. **防回退。** 精选内容不依赖数据库查询；数据库暂时不可用时，核心比较、FAQ 和来源仍可输出。没有添加付费研究或运行 Skill 的动作。

## 来源维护

编辑日期：2026-10-06。`lib/seo/presentation-pages.ts` 保存七个仓库的具体 SKILL.md 路径与固定提交版本。六个来源通过 GitHub API 读取，Image to Editable PPT 的来源通过 GitHub 固定版本页面核对。内容是独立的选型说明，不改变数据库中原有的审核、发布或安装状态。

不以 Star 数量代替实测，不虚构安全认证、安装成功、导出测试或评分。后续修改能力、依赖或许可时，先重新读来源，再同时更新比较信息、版本与编辑日期。

## 验收及上线后动作

本次验收（2026-10-06，包含七个 Agent 与八个专题）：

- `pnpm test`、`pnpm typecheck`、`pnpm build`、仓库链接检查、Agent 连接契约测试及 `git diff --check` 均通过。全仓库 lint 为 0 错误；新增测试文件的三项未使用参数警告已清理，并单独通过 lint 与专题回归。其余 25 项为既有文件警告。
- 对生产构建的八个页面用 Googlebot User-Agent 做本地 HTTP 检查：均为 200；单一 H1、独立标题与摘要、自指规范网址、index/follow、比较正文、锚点及 JSON-LD 对应正确。这是抓取响应检查，不是 Google 已收录的证明。
- 按上表顺序，社区候选数为 7 / 3 / 5 / 1 / 1 / 1 / 3 / 1。WorkBuddy 原生 PPTX 指南、CodeBuddy 官方文档技能流程与社区候选分开表达；没有把平台内置能力重复计成 GitHub Skill。
- `/sitemaps/best.xml` 返回 200，八页均登记，lastmod 使用本次真实编辑日期。
- 浏览器检查桌面及 390px 手机布局：八页均没有整页横向溢出，比较表宽 1100px 并在自身 350px 手机容器内滚动；七个 Agent 入口正常。豆包 FAQ 可展开，Trae / 豆包 / Cursor / CodeBuddy 的首屏按钮均能进入对应的设置说明。
- 构建其他既有页面出现数据库超时与回退日志，`/use-cases` 自动重试后完成；完整构建以 0 退出。本次八个 PPT 专题的核心正文不依赖这些数据库查询。
- 用户已授权 GitHub 同步和生产部署。通过已有 Git 集成发布经过验收的提交，生产状态和公网检查结果以本任务最终交付为准。Google 实际收录与排名尚未验证。

后续维护与发布检查：

- 回归：错误关键词候选、低全站排序的精选候选、八页差异、服务端比较正文、所有锚点、JSON-LD 与规范网址。
- 运行站点回归测试、typecheck 和 production build。
- 对八个生产构建页面检查 200 状态、title / description / canonical / robots、可抓取正文、源链接和移动端布局。
- 上线后在 Google Search Console 对八页做网址检查，确认收录、最后抓取与 Google 选择的规范网址；对修改页请求索引，提交现有 sitemap。请求索引不保证收录或排名。
- 记录上线前后的同口径数据：美国、Web 搜索、`ppt skills` / `codex ppt skills` / `workbuddy ppt skills` / `trae ppt skills` / `doubao ppt skills` / `cursor ppt skills` / `codebuddy ppt skills` / `editable powerpoint` 查询族，按页面记录曝光、点击、CTR 与平均排名。分别观察 14 天和 28 天；不得将短期波动当作增长趋势。
- 若主专题未收录，按 Search Console 的具体原因处理；若已收录但曝光不足，结合查询与页面数据调整选型内容、内部入口及原创案例。若不同页长期争取相同查询，再决定合并或重新区分。
- 外链建设需要真实可引用的比较与案例。可规划作者合作，但本轮没有向作者发送消息或购买链接。

本轮包含网站代码、内容升级、验证、GitHub 同步和授权生产发布。Search Console 操作与运行 Skill 生成测试文稿的结果需分别验证，本轮未据此宣称排名提升或文稿生成实测。
