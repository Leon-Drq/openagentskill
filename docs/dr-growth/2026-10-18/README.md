# OpenAgentSkill 30 天外链增长工作包

启动日：2026-10-18。执行窗口：10-18 至 11-16。目标是争取 5–10 个相关独立网站的自愿引用；不是 DR 或搜索流量承诺。用户确认目前没有外链明细导出，先做公开样本。

## 已交付

- 非 www 域名改为指向原 www 主域名的 HTTP 308；路径与查询参数保留。配置与现场证据见 [domain-redirect.json](./domain-redirect.json)。没有改变 DNS。
- [公开样本核查](./backlink-audit.md)：4 页、去重 3 个来源主机；其中 2 个主机已有官网锚点，不能记为新增。脚本因本机 DNS 保留地址产生的 unknown 与浏览器人工 DOM 证据分开记录。
- [潜在线索](./prospects.md)：24 个不同域名，20 条合格潜在线索、2 条联系入口待核验、1 条已有链接、1 条按编辑规则排除。页面未观察到链接不证明整个域名没有链接。
- [5 封对象化草稿](./outreach-drafts.md)：未发送。作者合作先核对归属和资料；研究投稿使用有分母、日期和下载证据的报告。
- `/creator-kit#cite-your-listing`：发布页 URL/slug 转成可复制的 Markdown 或 HTML 普通文字引用，去除跟踪参数；提供真实案例采集模板。引用完全自愿，不与审核分数或上架交换。
- `/reports/skill-readiness-2026-10-18`：冻结的 1,000 条公开记录、两组明确分母、逐行 CSV/JSON、图表、哈希、离线复算。没有执行第三方 Skill，不能作为安装成功率或全生态统计。
- [衡量计划](./measurement-plan.md)：每周记录来源与链接变化，DR 按同一提供商每月比较。复制引用事件 `creator_citation_copy` 沿用现有分析同意设置；复制次数不等于外链发布数。

## 第一轮操作

```sh
pnpm test:dr-growth
node scripts/build-skill-readiness-snapshot.mjs --check
node scripts/check-dr-growth.mjs https://www.openagentskill.com
node scripts/audit-backlinks.mjs --help
```

完整外链导出接入方式见 [核查文档](./backlink-audit.md)。后续输出使用新日期路径，保留首次检查时间，不覆盖本轮手工证据。

## 仍需推进

1. 对外发送：5 封草稿均未发送。外部消息需要明确发送指令和可用联系入口；不把公开个人主页等同于已获收件人许可或消息已送达。
2. 第 2 周作者案例：挑 3 个可复现任务，按公开模板记录实际版本、输入、输出与失败。当前只有素材与合作准备，未声称已完成三个 Skill 实测。
3. ClaudeAtlas / AgentSkills.site：存在内容相关性或补链机会，但公开联系入口未确认，暂缓发送。
4. 全量审计：缺 Ahrefs/AITDK 页面级导出。截图 DR 6、1.08K 外链、670 引荐域名仍是未独立核验的汇总，不能据此判定处罚或垃圾链接。
5. 使用增长：尚未取得当前 Search Console / 分析后台只读指标，不能报告新增用户、安装成功或 DR 提升。

发布与测试状态另见 [release.md](./release.md)。后续复盘只把实际观察到的新增链接和使用变化记为成果。
