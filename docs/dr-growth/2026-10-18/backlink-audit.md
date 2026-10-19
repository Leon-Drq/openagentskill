# 外链核查：2026-10-18 公开小样本

本次完成了可复用核查器、离线回归检查和 4 个公开页面的独立浏览器核验。**没有完成截图中 670 个引荐域名的全量核查，也没有验证或重新计算 DR。** 用户目前没有完整外链导出。

## 基线与观察

用户提供的 AITDK 截图显示 `www.openagentskill.com`：DR 6、外链 1.08K、引荐域名 670，dofollow 比例分别为 63% 和 55%。截图拍摄时间、底层数据提供商和域名统计范围尚未核实。机器可读记录见 [backlink-baseline.json](./backlink-baseline.json)。

| 公开页面 | 浏览器 DOM 观察 | 处理建议 |
| --- | --- | --- |
| [ClaudeAtlas / find-skills](https://claudeatlas.com/skills/Leon-Drq/find-skills/) | 有品牌和 API 地址文字；没有观察到官网 `<a>`；GitHub 链接 `rel="noopener"` | 已有提及补官网/文档链接的候选 |
| [Kaino / OpenAgentSkill](https://kaino.dev/discover/skills/7c1b309e-863d-4136-b43e-4fd2b9d5c1f7-openagentskill-ai-agent-skills-library) | 首页和 `/docs` 共 2 个官网链接，`rel="noreferrer"` | 已有链接，维护资料准确性；不能算新增成果 |
| [INITE / Atlas](https://inite.ai/en/atlas/openagentskill.com) | 6 个官网链接：2 个首页链接不含 nofollow；其余首页来源、llms.txt、openapi.json、api-docs 链接含 nofollow | 保留作者对链接属性的决定；核对资料，不重复请求首页链接 |
| [INITE / visibility](https://inite.ai/en/atlas/openagentskill.com/visibility) | robots.txt、llms.txt 两个链接，`rel="noopener noreferrer"`；页面 meta 为 `noindex, follow` | 与上行同一来源主机；不能另算一个引荐域名 |

本次浏览器共观察到 10 个官网 `<a>`，来自 3 个页面、2 个独立来源主机，其中 4 个链接含 nofollow。这是**已有链接样本**，不是本轮新增外链。未检查响应头中的机器人指令、来源页/目标页 HTTP 状态或搜索引擎索引。`noopener`、`noreferrer` 与 `nofollow` 分开记录；没有 nofollow 不等于保证获得排名权重。浏览器记录单独放在 JSON 的 `manualBrowserVerification`，不会改写自动核查结果。

自动核查尝试了同样的 4 个 URL。本机 DNS 为三个来源主机返回 `198.18.0.x` 保留地址，可能来自网络代理的 Fake-IP 模式。核查器按安全规则拒绝连接，结果全部为 `unknown / unsafe_address`。**这不表示页面失效或没有链接。** 没有关闭安全检查、绕过挑战、重试 403 或改写系统网络设置。

## 重复运行

从项目根目录执行（Node 22+，先安装项目依赖）：

```sh
node scripts/test-backlink-audit.mjs
node scripts/audit-backlinks.mjs --input docs/dr-growth/2026-10-18/backlink-import-template.csv --output local-audits/backlinks-YYYY-MM-DD.json --csv local-audits/backlinks-YYYY-MM-DD.csv --concurrency 2
```

下次复查时传入 `--previous local-audits/backlinks-YYYY-MM-DD.json`，保留每个来源页面的 `firstCheckedAt`。新输出使用新文件名，保留本轮基线。没有定时任务被创建，脚本也不会联系网站作者。

本机网络仍返回保留地址时，保持 `unknown`；可在正常解析到公网 IP 的受控环境运行，或继续使用独立人工浏览器证据。不要给保留地址加白名单。

### 输入

[backlink-import-template.csv](./backlink-import-template.csv) 是 4 条真实样本，同时示范输入格式。`target_url` 只是预期目标，不会被当作已验证链接。完整导出可另存为 UTF-8 CSV，或以下 JSON：

```json
[
  {
    "source_url": "https://publisher.org/article",
    "target_url": "https://www.openagentskill.com/docs",
    "note": "来自授权导出的待检查来源",
    "first_checked_at": "2026-10-18T00:00:00.000Z"
  }
]
```

| 字段 | 用途 |
| --- | --- |
| `source_url` | 必填，实际来源页面 URL，不能只有根域名 |
| `target_url` | 可选，导出中报告的目标；工具仍检查页面全部官网链接 |
| `note` | 可选，来源或人工备注 |
| `first_checked_at` | 可选，有效 ISO 日期；`--previous` 中的记录优先 |

JSON 也接受 `{ "sources": [...] }`。常见列名 `Referring page URL`、`Source URL`、`Target URL`、`Link URL` 会自动映射，大小写、空格和下划线不敏感。输入必须是逗号分隔 CSV；不自动猜测 XLSX、TSV 或未注明编码。单批最多 10,000 行，相同来源 URL（忽略 fragment）合并，保留其多个预期目标。不要在输入中放登录 URL、签名下载地址、令牌或其他私密查询参数。完整商业外链导出留在本地，提交前检查其许可与内容。

### 输出与边界

- `links_observed`：成功获取 HTML，并在 `<a href>` 中观察到本站域名或其子域名。
- `no_anchor_in_fetched_html`：成功获取 HTML，但未观察到此类 `<a>`。没有执行 JavaScript，不能据此断言渲染后或其他页面没有链接。
- `unknown`：无法可靠判断，例如 DNS、安全限制、robots、403、429、超时、非 HTML 或响应过大。不能按“无外链”计入。
- 每条链接保留锚文本、原始 href、rel、页面 nofollow、HTML 行号/短证据、目标 HTTP 状态及逐跳重定向链。正文只保存 SHA-256，不归档完整第三方页面。
- `reachable` 只表示本次目标返回 2xx；只有目标 404/410 才标为 `broken`。403/429/5xx 等均保留为 unknown。外部跳转另记 `external_redirect`。
- 统计按来源主机去重并折叠 www，不按链接条数计算域名数。没有公共后缀库，也没有声称计算服务商的注册域名口径 RD；不同子域名不能直接相加当作 RD。

网络层仅允许无凭据、默认端口的 HTTP(S) URL；拒绝本地/保留地址，每次跳转重新校验 DNS，并固定通过校验的 IP 发起连接，避免 DNS 二次解析。默认并发 2、上限 4；每次请求 15 秒，最多 5 次跳转、页面上限 1.5 MB；robots 上限 256 KB。遵守匹配的 robots 规则，robots 不可读或被阻止时停止该来源；不做自动重试。每个来源最多保存 100 个匹配锚点、检查前 20 个目标；超出预算明确留 unknown，不推断其状态。

## 还缺什么

公开核查器不需要帐号、密码或 API Key。全量核查缺的是来源页面级外链导出，而不是必须购买或提供凭据。收到文件后记录提供商、导出时间、域名范围、筛选条件，再按上述格式运行并复核 unknown。

DR 月度对照需要同一提供商、同一范围、同一时间口径的读数；搜索点击和有效使用需要网站所有者提供 Search Console / 现有分析工具的只读导出或连接。本轮没有这些后台数据，不能报告流量或安装增长。执行节奏和指标定义见 [measurement-plan.md](./measurement-plan.md)。
