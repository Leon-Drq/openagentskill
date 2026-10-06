# AI 视频 Skill 收录核对与 X 草稿

核对日期：2026-10-06。本文保留最初研究与草稿。实现与发布操作见 [视频专题发布说明](../video-workflow-publication.md)，最终串文见 [campaign JSON](../campaigns/video-workflows-20261006.json)。Skill 收录和 X 发送的实际结果需由发布日志确认。

线索：[jedeeai 的 10 篇视频教程汇总](https://x.com/jedeeai/status/2107358191432405329)。通过公开 X 数据读取文章正文，再以作者 GitHub 仓库和本站公开搜索接口核对。原帖的“Top 10”、收藏量、制作效果和费用均为原作者描述，不作为本站实测数据。

## 结论

适合做一期按视频用途组织的专题。10 篇文章并非 10 个独立 Skill：包括技能合集、已有工具的教程、独立 Skill、作品参考库和原理解读。优先新增 5 组来源，复用已有条目，其余保留为署名教程链接。

“暂未找到”指当天公开搜索 API 按完整 owner/repo 查询未返回精确或近似条目，不代表数据库中绝不存在历史、私有或未公开记录。实际发布仍需按路径与内容哈希去重。

## 逐项核对

| 原帖条目 | 对应来源 | 本站情况与建议 |
| --- | --- | --- |
| 1. 卡尔：Seedance 案例、模板与 Skills | [LearnPrompt/awesome-seedance](https://github.com/LearnPrompt/awesome-seedance) | 暂未找到。优先收录；按 `agents/skills` 下具体 Skill 路径拆分。原帖的 463 是视频案例数，不能当 Skill 数；README 数量持续变化且包含其他仓库的引用，不宜直接作为本站条目数。 |
| 2. Miles：Codex 零剪辑视频工作流 | [原文](https://x.com/miles_mazy/status/2097177704282136838) | 工作流文章涉及多个项目。HyperFrames、Remotion、Video Use、Video Shotcraft 已有公开搜索结果，复用这些条目。另提及的 [HyperFrames Community Skills](https://github.com/heygen-com/hyperframes-community-skills) 暂未找到，作为后续逐路径核对候选。edge-tts、CosyVoice 等是配套工具，不能只凭教程提及就当独立 Skill。 |
| 3. xilo：用代码制作视频 | [Kianzzz/xilo-opus-video](https://github.com/Kianzzz/xilo-opus-video) | 暂未找到。已读取 `skills/xilo-opus-video/SKILL.md`；先提三个方案并预览，再确认制作。值得新增。 |
| 4. 雪踏乌云：Codex + Hypit | [Hypit 现有详情](https://www.openagentskill.com/skills/hypit-ai-hypit-hypit) | 已收录。可补教程入口，不重复建条目。实际状态为 Owner published / Review required；当前接口还提示跟踪源变化或同步未完成，不能写成已验证或自动安装就绪。 |
| 5. 观默：高级动效制作 | [guanmo-ai/awesome-ai-motion](https://github.com/guanmo-ai/awesome-ai-motion) | 作者公开的是动效作品、源码与提示词参考库；当前读到的 README 未提供明确独立 Skill 入口。作为专题参考资源，不先包装成可安装 Skill。完整目录 API 遇到限流，尚未做全树排查。 |
| 6. Simon：手绘白板视频 | [trustfuture/simon-skills](https://github.com/trustfuture/simon-skills) | 暂未找到。已读取 `skills/whiteboard-video/SKILL.md`；需要同级 `video-common`、本地工具和火山 TTS 等配置，不能只下载单个 Markdown。值得新增。 |
| 7. 大雷：婚礼视频向导 | [aaronyi97/wedding-video-guided-wizard](https://github.com/aaronyi97/wedding-video-guided-wizard) | 暂未找到。已读取根目录 `SKILL.md`；14 步引导，含中英文入口，并有外部生图/视频与人工确认环节。值得新增。 |
| 8. 三个三：AI 动画全流程 | [原文](https://x.com/3three_AI/status/2100477301976891873) | 已读正文主要讲角色一致性、场景、镜头与节奏，未找到独立 Skill 仓库链接。保留为制作教程。 |
| 9. 宝玉：代码如何变成视频 | [原文](https://x.com/dotey/status/2105181393638531536) | 原理解读，底层引用 HyperFrames、Remotion 等。作为教程挂到已有条目或专题，不建立“宝玉视频 Skill”。 |
| 10. 想风：剪映自动化 | [luoluoluo22/jianying-editor-skill](https://github.com/luoluoluo22/jianying-editor-skill) | 暂未找到。已读取根目录 `SKILL.md`，内部名称为 `jianying-editor`。值得新增；介绍需明确是剪映专业版。README 说明 macOS 需要手动导出，不能承诺所有平台自动导出。 |

## 首批收录准备

以下是待发布候选，不是已发布清单。仓库源码只读，未安装、未调用第三方脚本，也未做运行成功验证。

| 仓库 | 精确路径 | 建议定位 |
| --- | --- | --- |
| Kianzzz/xilo-opus-video | `skills/xilo-opus-video/SKILL.md` | Code-driven video planning and rendering |
| trustfuture/simon-skills | `skills/whiteboard-video/SKILL.md` | Hand-drawn whiteboard explainers |
| aaronyi97/wedding-video-guided-wizard | `SKILL.md` | Guided wedding video production |
| luoluoluo22/jianying-editor-skill | `SKILL.md` | Jianying desktop editing automation |
| LearnPrompt/awesome-seedance | 已确认 15 个 `agents/skills/*/SKILL.md`；详见固定版本清单 | Seedance prompt and production workflows |

正式收录沿用 [owner-publishing.md](../owner-publishing.md) 的站长发布命令，每个 Skill 一个明确路径、固定提交版本和独立请求。保留原审核历史；站长收录不产生 AI 审核通过或运行验证结论。此轮未调用发布接口。

Seedance 仓库公开说明将代码、编辑整理和原始提示词/媒体区分处理：代码 MIT，整理内容 CC BY 4.0，原始提示词和媒体权利仍归各自作者。因此本站应写原创简介、保留作者和源链接；不能把整个视频素材库视为可自由搬运。其他条目也以原仓库与素材说明为准。

## 网站承接与内容安排

优先用现有 [视频用途页](https://www.openagentskill.com/use-cases/video-creation) 作为入口，在补齐条目后增加本期精选，或建立一个独立的、有原创比较内容的专题页。此轮没有修改或部署页面。

专题建议标题：**AI Video Skills: Choose by What You Want to Make**。

按用途展示：代码动效、白板讲解、婚礼故事、剪映剪辑、Seedance 分镜与提示词。每个条目回答：输入什么、输出什么、需要哪些工具或付费服务、作者是谁、原始来源在哪里、安装前需要了解什么。教程文章单独署名链接到相关 Skill。

发布节奏建议：一条总览串文，后续每篇聚焦一个具体用途。第一批选 xilo、白板视频和剪映，因为输出形态容易解释；婚礼视频单独说明引导式人工参与流程。演示视频只有在来源与展示权限明确时才加入，不把营销图当实际运行效果。

链接用本站真实详情页或专题页。以下草稿仅用了现有视频用途页；其含义是“继续浏览本站视频 Skills”，不声称本期新候选已经上线。新增条目上线后再替换成返回的真实详情 URL，不提前猜 slug。

衡量方式：在同一观察窗口记录展示、收藏、带 UTM 的站内访问，以及现有安装交接/复制事件。重点观察访问和后续行为；不承诺这套内容一定带来增长。UTM 用于识别流量，不代表相关事件统计已全部接通。

## X 英文串文草稿

遵循现有 [X 编辑规范](../x-editorial.md)。以下各段分别作为一条帖文，按顺序回复组成串文。仅为草稿，尚未发送。

### 1 / Opening

```text
What do you want your AI agent to make?

A motion demo, a whiteboard explainer, a wedding film, or an editable video draft?

Those need different workflows. We traced a creator roundup to the source repos. Here are 5 starting points, organized by output.
```

### 2 / Code-driven video

```text
1. Code-driven video: xilo-opus-video by @xilo2991.

Starts with 3 concepts and previews. You choose one before it builds and renders the video.

Useful for motion graphics and animated explainers.
https://github.com/Kianzzz/xilo-opus-video
```

### 3 / Whiteboard

```text
2. Whiteboard explainers: whiteboard-video by @HanZhang415188.

Combines hand-drawn scenes, narration, captions and covers. Setup includes local tools, a shared video-common folder and TTS credentials.

https://github.com/trustfuture/simon-skills
```

### 4 / Wedding film

```text
3. Wedding films: @AaronYiaazw's guided wizard.

14 stages from a couple's story to a subtitled film. Includes script approval and external image/video generation, with checkpoints throughout.

https://github.com/aaronyi97/wedding-video-guided-wizard
```

### 5 / Editing

```text
4. Editing: jianying-editor-skill.

Build editable Jianying desktop drafts from your assets, with captions and audio. The README specifies manual export on macOS.

Source: luoluoluo22
https://github.com/luoluoluo22/jianying-editor-skill
```

### 6 / Seedance

```text
5. Seedance workflows: awesome-seedance by LearnPrompt / @aiwarts.

A collection of prompt templates, Skills and linked examples. Pick a workflow for the kind of clip you want to make.

https://github.com/LearnPrompt/awesome-seedance
```

### 7 / Site link and attribution

```text
Explore more video skills on OpenAgentSkill:
https://www.openagentskill.com/use-cases/video-creation?utm_source=x&utm_medium=organic_social&utm_campaign=video_workflows_20261006

Source roundup: @jedeeai
https://x.com/jedeeai/status/2107358191432405329

This thread maps published workflows; we haven't run these five ourselves.
```

## 可以单独使用的本站推文

这条文案只介绍现有视频用途页，适合不发完整串文时使用。

```text
Making a video with an AI agent?

Start with the job: plan the shots, generate B-roll, edit footage, or add narration and captions.

Explore video skills by task on OpenAgentSkill:
https://www.openagentskill.com/use-cases/video-creation?utm_source=x&utm_medium=organic_social&utm_campaign=video_workflows_20261006
```

## 本轮验证范围

已读汇总中的 10 篇正文；核对作者仓库，读取上述 4 个精确 SKILL.md；按仓库名称查询本站公开搜索接口，并确认已有条目返回结果。初步研究时未认证目录 API 限流；实现阶段已通过 GitHub 连接器枚举 Seedance 的 15 个路径，连同另外 4 个 Skill 读取并记录提交和内容哈希。动效库继续作为参考资源。

本研究中的可用性描述来自源码，未执行第三方 Skill。网站应用测试不代表这些 Skill 已通过运行测试。网站变更、收录和社交发布分别记录结果。
