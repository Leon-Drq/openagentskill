export default function Page() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Pixel Grid Background Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #000 1px, transparent 1px),
            linear-gradient(to bottom, #000 1px, transparent 1px)
          `,
          backgroundSize: '8px 8px'
        }}
      />
      
      <div className="relative">
        {/* Header/Navigation */}
        <header className="border-b border-border">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-foreground rounded-full flex items-center justify-center font-display font-bold text-xs sm:text-sm">O</span>
              <span className="font-display text-base sm:text-lg lg:text-xl font-semibold">Open Agent Skill</span>
            </div>
            <nav className="flex gap-1">
              <a href="/" className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity">
                {'Home'}
              </a>
              <a href="/skills" className="px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity">
                {'Skills'}
              </a>
              <a href="/docs" className="hidden sm:inline-block px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity">
                {'Docs'}
              </a>
              <a href="/api" className="hidden md:inline-block px-2 sm:px-3 lg:px-4 py-1.5 text-xs sm:text-sm hover:opacity-60 transition-opacity">
                {'API'}
              </a>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 lg:py-24 text-center">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 text-balance leading-tight">
            {'OPEN AGENT SKILL'}
          </h1>
          <p className="font-display text-base sm:text-lg md:text-xl lg:text-2xl text-secondary mb-8 sm:mb-12 lg:mb-16 italic text-balance">
            {'As agents emerge to reshape how we interact with intelligence, a new marketplace is born.'}
          </p>

          {/* Try it Now Section */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-sm sm:text-base font-semibold mb-4 tracking-wide">{'TRY IT NOW'}</h2>
            <div className="max-w-2xl mx-auto border border-border bg-card p-4 sm:p-6">
              <pre className="text-left font-mono text-xs sm:text-sm md:text-base overflow-x-auto">
                <code>{'$ npx skills add <owner/repo>'}</code>
              </pre>
            </div>
            <p className="text-xs sm:text-sm text-secondary mt-4">
              {'Install any skill with a single command. No configuration needed.'}
            </p>
          </div>

          {/* Supported Agents */}
          <div className="mb-12 sm:mb-16 lg:mb-20">
            <h2 className="text-sm sm:text-base font-semibold mb-6 tracking-wide">{'AVAILABLE FOR THESE AGENTS'}</h2>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-3xl mx-auto">
              {['Claude', 'GPT-4', 'Gemini', 'Cursor', 'Windsurf', 'Cline', 'Goose', 'LangChain', 'AutoGPT', 'CrewAI', 'Copilot', 'Roo', 'Cody', 'Kilo', 'AMP'].map((agent) => (
                <span key={agent} className="px-3 sm:px-4 py-2 border border-border text-xs sm:text-sm font-mono hover:bg-muted transition-colors">
                  {agent}
                </span>
              ))}
            </div>
          </div>

          {/* Tag Navigation */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 sm:mb-16 lg:mb-20 text-xs sm:text-sm">
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border hover:bg-muted transition-colors cursor-pointer">
              {'The Open Ecosystem'}
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border hover:bg-muted transition-colors cursor-pointer">
              {'Skill Marketplace'}
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border hover:bg-muted transition-colors cursor-pointer">
              {'Composable Architecture'}
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border hover:bg-muted transition-colors cursor-pointer">
              {'Cross-Platform Standards'}
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border hover:bg-muted transition-colors cursor-pointer">
              {'Developer Community'}
            </span>
            <span className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border hover:bg-muted transition-colors cursor-pointer">
              {'Agent Interoperability'}
            </span>
          </div>
        </section>

        {/* Main Article Content */}
        <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 lg:pb-32">
          <header className="mb-8 sm:mb-10 lg:mb-12">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
              {'The Future of Agent Skills'}
            </h2>
            <p className="text-secondary text-xs sm:text-sm">
              {'OpenAgentSkill Team, February 2026'}
            </p>
          </header>

          <div className="space-y-6 sm:space-y-8 text-base sm:text-lg leading-relaxed">
            <p className="text-pretty">
              {'Today\'s most powerful AI agents can think, reason, and execute complex workflows — but they can\'t easily share capabilities. Each agent exists in isolation, unable to leverage the collective intelligence of the broader ecosystem.'}
            </p>

            <p className="text-pretty">
              {'LangChain cannot seamlessly adopt AutoGPT\'s planning skills. CrewAI cannot instantly integrate custom research capabilities built for other frameworks. Developer-built skills remain locked within their original contexts, forcing endless reimplementation of the same fundamental capabilities. '}
              <strong>{'Without interoperability, agents cannot reach their full potential.'}</strong>
            </p>

            <p className="text-pretty">
              {'The bottleneck is no longer intelligence — it\'s '}
              <em>{'discoverability'}</em>
              {'. The existing landscape assumes each team will build from scratch, preventing agents from accessing the collective knowledge of the developer community.'}
            </p>

            <blockquote className="pl-8 border-l-2 border-foreground my-12 py-2">
              <p className="font-display text-2xl italic text-balance">
                {'We have built minds that can think for themselves. We have not let them learn from each other.'}
              </p>
            </blockquote>

            <h3 className="font-display text-3xl font-semibold mt-16 mb-6">
              {'An Open Marketplace for Skills'}
            </h3>

            <p className="text-pretty">
              {'Open Agent Skill establishes a unified platform where developers publish, discover, and compose agent capabilities. Think of it as the NPM of agent intelligence — a standardized registry where skills become reusable, testable, and interoperable across frameworks.'}
            </p>

            {/* Pixel Art Illustration */}
            <div className="my-16 bg-muted p-12 flex flex-col items-center gap-8">
              <div className="grid grid-cols-3 gap-8 w-full max-w-2xl">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-foreground opacity-10" 
                       style={{
                         clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
                       }} 
                  />
                  <div className="font-mono text-xs uppercase tracking-wider mb-2">{'LangChain'}</div>
                  <div className="text-sm text-secondary">{'can discover new research skills'}</div>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-foreground opacity-10"
                       style={{
                         clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                       }}
                  />
                  <div className="font-mono text-xs uppercase tracking-wider mb-2">{'AutoGPT'}</div>
                  <div className="text-sm text-secondary">{'can integrate code generation'}</div>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-foreground opacity-10"
                       style={{
                         clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
                       }}
                  />
                  <div className="font-mono text-xs uppercase tracking-wider mb-2">{'CrewAI'}</div>
                  <div className="text-sm text-secondary">{'can compose multi-agent workflows'}</div>
                </div>
              </div>
              <div className="text-sm text-secondary text-center max-w-md">
                {'Agents gain access to the collective intelligence of the ecosystem.'}
              </div>
            </div>

            <h3 className="font-display text-3xl font-semibold mt-16 mb-6">
              {'Core Principles'}
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-xl mb-2">{'1. Standardization Over Fragmentation'}</h4>
                <p className="text-secondary text-pretty">
                  {'A common skill specification ensures compatibility across frameworks, eliminating vendor lock-in and enabling true composability.'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-xl mb-2">{'2. Community-Driven Quality'}</h4>
                <p className="text-secondary text-pretty">
                  {'Peer review, benchmarking, and transparent performance metrics ensure high-quality contributions while preventing low-effort submissions.'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-xl mb-2">{'3. Composable by Design'}</h4>
                <p className="text-secondary text-pretty">
                  {'Skills are building blocks. Visual workflow editors allow developers to chain capabilities without writing boilerplate integration code.'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-xl mb-2">{'4. Open Source at Core'}</h4>
                <p className="text-secondary text-pretty">
                  {'The platform itself is open source, ensuring transparency, auditability, and community ownership of the ecosystem\'s evolution.'}
                </p>
              </div>
            </div>

            <h3 className="font-display text-3xl font-semibold mt-16 mb-6">
              {'Join the Ecosystem'}
            </h3>

            <p className="text-pretty">
              {'We invite developers, researchers, and builders to participate in shaping this new infrastructure. Whether you\'re publishing your first skill, composing complex workflows, or contributing to the platform itself — there\'s a place for you in the Open Agent Skill community.'}
            </p>

            <div className="mt-12 pt-8 border-t border-border">
              <div className="flex gap-6 text-sm">
                <a href="/skills" className="underline hover:opacity-60 transition-opacity">
                  {'Explore the Marketplace'}
                </a>
                <a href="/docs" className="underline hover:opacity-60 transition-opacity">
                  {'Read the Documentation'}
                </a>
                <a href="https://discord.gg/openagentskill" className="underline hover:opacity-60 transition-opacity">
                  {'Join the Community'}
                </a>
                <a href="https://github.com/openagentskill" className="underline hover:opacity-60 transition-opacity">
                  {'View on GitHub'}
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* Footer */}
        <footer className="border-t border-border mt-32">
          <div className="max-w-5xl mx-auto px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
              <div>
                <h3 className="font-semibold mb-4">{'Platform'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li><a href="/skills" className="hover:text-foreground transition-colors">{'Marketplace'}</a></li>
                  <li><a href="/composer" className="hover:text-foreground transition-colors">{'Skill Composer'}</a></li>
                  <li><a href="/benchmarks" className="hover:text-foreground transition-colors">{'Benchmarks'}</a></li>
                  <li><a href="/standards" className="hover:text-foreground transition-colors">{'Standards'}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{'Developers'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li><a href="/docs" className="hover:text-foreground transition-colors">{'Documentation'}</a></li>
                  <li><a href="/api" className="hover:text-foreground transition-colors">{'API Reference'}</a></li>
                  <li><a href="/docs/examples" className="hover:text-foreground transition-colors">{'Examples'}</a></li>
                  <li><a href="https://github.com/openagentskill" className="hover:text-foreground transition-colors">{'GitHub'}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{'Community'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li><a href="https://discord.gg/openagentskill" className="hover:text-foreground transition-colors">{'Discord'}</a></li>
                  <li><a href="https://community.openagentskill.com" className="hover:text-foreground transition-colors">{'Forum'}</a></li>
                  <li><a href="/contributors" className="hover:text-foreground transition-colors">{'Contributors'}</a></li>
                  <li><a href="/bounties" className="hover:text-foreground transition-colors">{'Bounties'}</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">{'Resources'}</h3>
                <ul className="space-y-2 text-secondary">
                  <li><a href="/blog" className="hover:text-foreground transition-colors">{'Blog'}</a></li>
                  <li><a href="/research" className="hover:text-foreground transition-colors">{'Research'}</a></li>
                  <li><a href="/case-studies" className="hover:text-foreground transition-colors">{'Case Studies'}</a></li>
                  <li><a href="/about" className="hover:text-foreground transition-colors">{'About'}</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-border flex justify-between items-center text-xs text-secondary">
              <p>{'© 2026 Open Agent Skill. Building the future of autonomous intelligence.'}</p>
              <div className="flex gap-4">
                <a href="#" className="hover:text-foreground transition-colors">{'Privacy'}</a>
                <a href="#" className="hover:text-foreground transition-colors">{'Terms'}</a>
                <a href="#" className="hover:text-foreground transition-colors">{'License'}</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
