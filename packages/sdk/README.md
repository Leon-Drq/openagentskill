# @openagentskill/sdk

Dependency-free JavaScript client for the public OpenAgentSkill agent infrastructure.

```js
import { OpenAgentSkill } from '@openagentskill/sdk'

const registry = new OpenAgentSkill()
const plan = await registry.resolve('localize a China SaaS landing page', { agent: 'codex' })
console.log(plan.recommendation_lanes)
```

The package is kept in this repository as a publishable package. It is not published automatically.
