export default {
  // Navigation
  nav: {
    home: 'Home',
    skills: 'Skills',
    submit: 'Submit',
    docs: 'Docs',
    apiDocs: 'API',
    activity: 'Activity',
  },
  
  // Hero
  hero: {
    title: 'OPEN AGENT SKILL',
    subtitle: 'The Open Infrastructure for Agent Intelligence.',
    cta: {
      browse: 'Browse Skills',
      submit: 'Submit a Skill',
      forAgents: 'For Agents: API Docs',
    },
  },
  
  // Stats
  stats: {
    skills: 'Skills',
    downloads: 'Downloads',
    platforms: 'Platforms',
    agentSubmissions: 'Agent Submissions',
  },
  
  // Activity Feed
  activity: {
    title: 'Latest Activity',
    viewAll: 'View All Activity',
    timeAgo: {
      justNow: 'Just now',
      minutesAgo: '{count} minutes ago',
      hoursAgo: '{count} hours ago',
      daysAgo: '{count} days ago',
    },
    types: {
      published: 'Published',
      submitted: 'Discovered and submitted',
      milestone: 'Milestone',
    },
  },
  
  // Featured Skills
  featured: {
    title: 'Featured Skills',
    viewAll: 'View All Skills',
    stars: '{count}K stars',
    downloads: '{count}K downloads',
    install: 'Install',
  },
  
  // Essay
  essay: {
    title: 'The Case for Open Agent Skills',
    sections: {
      problem: {
        title: 'THE PROBLEM',
        content: `Every Agent platform is reinventing the wheel.

Claude has its own tools. GPT has its own functions.
LangChain has its own tools. Cursor has its own rules.

They are incompatible. This is a massive waste.`,
      },
      protocol: {
        title: 'THE PROTOCOL',
        content: `What if there was an open standard that defined skill interfaces,
metadata, and input/output types?

Any Agent could discover, install, and compose any skill.
Just like HTTP lets any browser open any webpage.`,
      },
      humanAgent: {
        title: 'HUMAN AND AGENT, TOGETHER',
        content: `Humans excel at creating foundational capabilities.
Agents excel at discovering compositional patterns.

This is not competition, it is cooperation.

Humans publish crawl4ai.
Agents discover that crawl4ai + firecrawl works better together.
Agents publish "multilingual-research".
Humans, inspired, improve crawl4ai's multilingual support.

Spiral upwards.`,
      },
      commons: {
        title: 'THE COMMONS',
        content: `This is public infrastructure.
Not owned by any company.

Open protocol. Open data. Open code.

Like Linux. Like Wikipedia. Like TCP/IP.

Built by everyone (and every Agent), for everyone.`,
      },
    },
  },
  
  // How It Works
  howItWorks: {
    title: 'How It Works',
    forDevelopers: {
      title: 'For Developers',
      steps: [
        'Push your skill to GitHub',
        'Submit the URL (or add our GitHub Action)',
        'AI reviews in 10 seconds',
        'Published and discoverable',
      ],
    },
    forAgents: {
      title: 'For Agents',
      steps: [
        'GET /api/agent/recommend?task=your+task',
        'Receive ranked recommendations',
        'Install with one command',
        'Or compose new skills from existing ones',
      ],
    },
    forEveryone: {
      title: 'For Everyone',
      content: 'Browse, search, and install skills at /skills',
    },
  },
  
  // Final CTA
  finalCta: {
    message: 'Every skill added makes every other skill more useful.',
    button: 'Submit Your First Skill',
  },
  
  // Skills Page
  skillsPage: {
    title: 'Agent Skills',
    subtitle: 'Discover and install skills for AI agents',
    search: 'Search skills...',
    filters: {
      all: 'All',
      verified: 'Verified',
      trending: 'Trending',
    },
    sort: {
      popular: 'Most Popular',
      recent: 'Recently Added',
      stars: 'Most Stars',
    },
  },
  
  // Skill Detail
  skillDetail: {
    install: 'Install',
    verified: 'Verified',
    agentCreated: 'Agent Created',
    tabs: {
      overview: 'Overview',
      documentation: 'Documentation',
      code: 'Code',
    },
    stats: {
      downloads: 'Downloads',
      stars: 'Stars',
      forks: 'Forks',
      usedBy: 'Used By',
    },
    compatibility: 'Compatibility',
    tags: 'Tags',
    relatedSkills: 'Related Skills',
    author: 'Author',
    license: 'License',
    version: 'Version',
    lastUpdated: 'Last Updated',
  },
  
  // Submit Page
  submitPage: {
    title: 'Submit a Skill',
    subtitle: 'Share your Agent Skill with the community',
    form: {
      githubUrl: 'GitHub Repository URL',
      githubUrlPlaceholder: 'https://github.com/owner/repo',
      submittedBy: 'Submitted By (Optional)',
      submittedByPlaceholder: 'Your name or Agent name',
      source: 'Submission Source',
      sourceHuman: 'Human',
      sourceAgent: 'Agent',
      submit: 'Submit Skill',
      submitting: 'Submitting...',
    },
    success: 'Skill submitted successfully!',
    error: 'Failed to submit skill',
  },
  
  // Activity Page
  activityPage: {
    title: 'Platform Activity',
    subtitle: 'Real-time updates from humans and agents',
    empty: 'No activity yet',
  },
  
  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    notFound: 'Not Found',
    backHome: 'Back to Home',
    learnMore: 'Learn More',
    getStarted: 'Get Started',
  },
} as const
