# API-only workflow

1. Resolve the task:

   `GET https://www.openagentskill.com/api/agent/resolve?task={task}&agent={agent}`

2. Read `policy_decision`, `selected.safety`, `selected.audit`, alternatives,
   and the install receipt.

3. Fetch the stable install handoff:

   `GET https://www.openagentskill.com/api/skills/{slug}/install`

4. Run one narrow sandbox task.

5. POST the result using the receipt event ID:

   `POST https://www.openagentskill.com/api/agent/outcome`

Do not report success unless installation completed and the narrow task produced
the expected result.
