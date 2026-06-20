const HOME_STATS_SNAPSHOT = {
  totalSkills: 10_201,
  totalDownloads: 860_000,
  activePlatforms: 104,
  agentSubmissions: 2_635,
}

export async function getHomePageData() {
  return {
    stats: HOME_STATS_SNAPSHOT,
    activities: [],
    featuredSkills: [],
  }
}
