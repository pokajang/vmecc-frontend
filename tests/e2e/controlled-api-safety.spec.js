const { expect, test } = require('@playwright/test')
const {
  isControlledApiTransportResourceType,
  isRequestWithinControlledApi,
  normalizeControlledApiBaseUrl,
} = require('./support/controlled-api-stubs')
const { getLoopbackUrlAliases, normalizeLoopbackOrigin } = require('./support/loopback-origin')

test('mocked E2E API contracts fail closed outside the explicit loopback origin', () => {
  const apiBaseUrl = normalizeControlledApiBaseUrl('http://127.0.0.1:8123/api/')

  expect(apiBaseUrl).toBe('http://127.0.0.1:8123/api')
  expect(isRequestWithinControlledApi('http://127.0.0.1:8123/api/auth/session', apiBaseUrl)).toBe(
    true,
  )
  expect(isRequestWithinControlledApi('http://127.0.0.1:8123/apiary/session', apiBaseUrl)).toBe(
    false,
  )
  expect(
    isRequestWithinControlledApi('https://api.example.test/api/auth/session', apiBaseUrl),
  ).toBe(false)

  expect(() => normalizeControlledApiBaseUrl('https://api.example.test/api')).toThrow(
    /localhost-or-127\.0\.0\.1/,
  )
  expect(normalizeControlledApiBaseUrl('http://localhost:8123/api')).toBe(
    'http://localhost:8123/api',
  )
  expect(() => normalizeControlledApiBaseUrl('http://127.0.0.1/api')).toThrow(
    /localhost-or-127\.0\.0\.1/,
  )
})

test('loopback helpers normalize both local aliases without broadening the safety boundary', () => {
  expect(normalizeLoopbackOrigin('http://localhost:3000', 'Frontend URL')).toBe(
    'http://localhost:3000',
  )
  expect(getLoopbackUrlAliases('http://127.0.0.1:8000/api')).toEqual([
    'http://127.0.0.1:8000/api',
    'http://localhost:8000/api',
  ])
  expect(() => normalizeLoopbackOrigin('https://example.test', 'Frontend URL')).toThrow(
    /localhost-or-127\.0\.0\.1/,
  )
})

test('the API guard does not mistake Vite source modules for browser API traffic', () => {
  expect(isControlledApiTransportResourceType('fetch')).toBe(true)
  expect(isControlledApiTransportResourceType('xhr')).toBe(true)
  expect(isControlledApiTransportResourceType('script')).toBe(false)
  expect(isControlledApiTransportResourceType('stylesheet')).toBe(false)
  expect(isControlledApiTransportResourceType('image')).toBe(false)
})
