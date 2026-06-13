import en from './en'

const ko = {
  ...en,
  nav: {
    ...en.nav,
    home: '홈',
    skills: '스킬',
    tasks: '작업',
    packs: '스킬 팩',
    compare: '비교',
    submit: '제출',
    submitSkill: '스킬 제출',
    docs: '문서',
    apiDocs: 'API',
    activity: '활동',
    forAgents: 'Agent용',
  },
  hero: {
    ...en.hero,
    title: 'AI agents를 위한 Skill layer.',
    subtitle: 'AI agent가 올바른 재사용 가능 Skill을 자동으로 찾고, 비교하고, 설치하게 합니다. OpenAgentSkill은 AI Agent Skills의 npm입니다.',
    tryItNow: '지금 사용',
    orDescribeTask: '작업 설명',
    taskPlaceholder: '웹사이트를 크롤링하고 구조화 데이터를 추출...',
    findSkills: 'Skill 찾기',
    searching: '검색 중...',
    recommendedSkills: '추천 Skill',
    noResults: '일치하는 Skill을 찾지 못했습니다. 다른 설명을 입력해 보세요.',
    confidence: '일치도',
    installCommand: '설치',
    cta: {
      browse: 'Agent에 맞는 Skill 찾기',
      submit: 'Skill 제출',
      forAgents: 'Agent API',
    },
  },
  stats: {
    ...en.stats,
    skills: '스킬',
    downloads: '다운로드',
    platforms: '플랫폼',
    agentSubmissions: 'Agent 제출',
  },
  common: {
    ...en.common,
    loading: '로딩 중...',
    error: '오류',
    notFound: '찾을 수 없음',
    backHome: '홈으로 돌아가기',
    learnMore: '더 알아보기',
    getStarted: '시작하기',
  },
}

export default ko
