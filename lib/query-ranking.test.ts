import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getLocalizationIntentFitScore,
  isLocalizationQuery,
  tokenizeQuery,
} from './query-ranking.ts'

test('tokenizeQuery removes low-information task words', () => {
  assert.deepEqual(
    tokenizeQuery('Localize a SaaS product for launch in China'),
    ['localize', 'saas', 'product', 'launch', 'china']
  )
})

test('isLocalizationQuery recognizes SaaS localization and China launch intent', () => {
  const query = 'localize a saas product for launch in china'
  assert.equal(isLocalizationQuery(query, tokenizeQuery(query)), true)
})

test('localization fit rewards relevant skills and rejects generic coding skills', () => {
  const relevant = getLocalizationIntentFitScore(
    'localization',
    'SaaS localization, internationalization, Chinese locale, and China market entry'
  )
  const generic = getLocalizationIntentFitScore(
    'coding',
    'General coding patterns for building software products'
  )

  assert.ok(relevant > 0)
  assert.ok(generic < 0)
})
