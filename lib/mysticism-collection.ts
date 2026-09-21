// Editorial navigation only: publication/review state remains on each Skill record.
// Membership does not grant AI approval, creator verification or install permission.
export const MYSTICISM_PATH = '/topics/mysticism'
export const MYSTICISM_USE_CASE = 'mysticism'
export const MYSTICISM_PACK = 'mysticism-agent-pack'
export const MYSTICISM_GROUPS = ['divination', 'charts', 'reflection', 'space'] as const
export type MysticismGroup = typeof MYSTICISM_GROUPS[number]

export const MYSTICISM_SKILLS: Array<{
  repo: string; group: MysticismGroup; name: string; nameZh: string;
  description: string; descriptionZh: string; demoPath: string;
}> = [
  { repo: 'liuyao-skill', group: 'divination', name: 'Liu Yao', nameZh: '六爻起卦', demoPath: '/',
    description: 'Organize six coin throws into a traditional hexagram reading for one specific question.', descriptionZh: '将六次投掷结果整理为传统卦象，围绕一个具体问题解读。' },
  { repo: 'meihua-yishu-skill', group: 'divination', name: 'Mei Hua Yi Shu', nameZh: '梅花易数', demoPath: '/meihua',
    description: 'Explore a time-bounded question using time, supplied numbers, or an explicitly random draw.', descriptionZh: '用时间、用户提供的数字或明确标注的随机起卦，探索一个即时问题。' },
  { repo: 'qimen-dunjia-skill', group: 'divination', name: 'Qi Men Dun Jia', nameZh: '奇门遁甲', demoPath: '/qimen',
    description: 'Read a traditional nine-palace chart, with timing and direction kept separate from real-world evidence.', descriptionZh: '整理九宫盘中的时机与方位象征，将传统解释与现实证据分开。' },
  { repo: 'daily-fortune-skill', group: 'divination', name: 'Daily Fortune', nameZh: '每日灵签', demoPath: '/fortune',
    description: 'Turn a daily fortune sign into a small action and an evening reflection, without outcome guarantees.', descriptionZh: '把每日灵签转为一个小行动和晚间回顾，不承诺现实结果。' },
  { repo: 'bazi-skill', group: 'charts', name: 'BaZi · Four Pillars', nameZh: '八字四柱', demoPath: '/life-book/main',
    description: 'Organize birth-time conventions and Four Pillars calculations for cultural study and self-reflection.', descriptionZh: '确认出生时间与历法约定，整理四柱计算结果，用于文化学习与自我观察。' },
  { repo: 'ziwei-doushu-skill', group: 'charts', name: 'Zi Wei Dou Shu', nameZh: '紫微斗数', demoPath: '/ziwei',
    description: 'Separate chart placements, calendar assumptions, and traditional interpretations of the twelve palaces.', descriptionZh: '将十二宫排盘字段、历法假设和传统解释分层呈现。' },
  { repo: 'chenggu-skill', group: 'charts', name: 'Chenggu', nameZh: '称骨解读', demoPath: '/chenggu',
    description: 'Explain a verified traditional bone-weight verse as folklore, never as a measure of personal worth.', descriptionZh: '解释核对过的骨重与传统歌诀，不用数值衡量人的价值。' },
  { repo: 'life-kline-skill', group: 'charts', name: 'Life K-Line', nameZh: '人生 K 线', demoPath: '/life-kline',
    description: 'Visualize a supplied BaZi-derived series. Model indices are not probabilities, returns, or lifespan estimates.', descriptionZh: '展示已提供的八字周期数据；模型指数不是概率、收益率或寿命预测。' },
  { repo: 'natal-shadow-skill', group: 'charts', name: 'Natal Shadow', nameZh: '星盘与自我观察', demoPath: '/natal-shadow',
    description: 'Use natal-chart symbolism as journaling prompts, checked against the user’s own lived examples.', descriptionZh: '把星盘象征作为日记与自我观察提示，并对照用户自己的生活实例。' },
  { repo: 'relationship-reading-skill', group: 'reflection', name: 'Relationship Reading', nameZh: '关系探索', demoPath: '/relations',
    description: 'Reflect on reported interactions, communication and boundaries without claiming access to another person’s thoughts.', descriptionZh: '根据已知互动探索沟通与边界，不声称能读懂他人未表达的想法。' },
  { repo: 'talent-discovery-skill', group: 'reflection', name: 'Talent Discovery', nameZh: '天赋发现', demoPath: '/talent-discovery',
    description: 'A non-divination companion: turn repeated real-world examples into testable strengths and small career experiments.', descriptionZh: '非占卜配套工具：从重复出现的行为实例中提炼优势假设，设计小型职业实验。' },
  { repo: 'wishing-lantern-skill', group: 'reflection', name: 'Wishing Lantern', nameZh: '心愿灯', demoPath: '/wishing-lantern',
    description: 'Connect a wish to controllable daily actions and a review date, without supernatural guarantees.', descriptionZh: '把心愿连接到可控的每日行动和回顾日期，不承诺超自然效果。' },
  { repo: 'palm-reading-skill', group: 'space', name: 'Palm Reading', nameZh: '手相文化', demoPath: '/fortune-palm',
    description: 'Describe visible palm features and traditional symbolism; not identity, health, or sensitive-trait inference.', descriptionZh: '区分可见掌纹与传统象征，不推断身份、健康或敏感属性。' },
  { repo: 'face-reading-skill', group: 'space', name: 'Face Reading', nameZh: '面相文化', demoPath: '/fortune-face',
    description: 'Explore traditional visual symbolism, not factual judgments about personality, trustworthiness, health, or destiny.', descriptionZh: '了解传统视觉象征，不据面貌判定性格、可信度、健康或命运。' },
  { repo: 'fengshui-skill', group: 'space', name: 'Feng Shui', nameZh: '阳宅风水', demoPath: '/fortune-fengshui',
    description: 'Distinguish practical layout observations from traditional Bagua associations. No causal claims about luck.', descriptionZh: '区分实用空间观察与传统八卦象征，不承诺改变运气。' },
]

export const mysticismSkillPath = (repo: string) => `/skills/leon-drq-${repo}`
export const MYSTICISM_SLUGS = MYSTICISM_SKILLS.map(skill => `leon-drq-${skill.repo}`)
