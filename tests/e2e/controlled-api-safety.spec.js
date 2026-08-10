const { expect, test } = require('@playwright/test')
const {
  isControlledApiTransportResourceType,
  isRequestWithinControlledApi,
  normalizeControlledApiBaseUrl,
} = require('./support/controlled-api-stubs')

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
    /explicit http:\/\/127\.0\.0\.1:<port>/,
  )
  expect(() => normalizeControlledApiBaseUrl('http://localhost:8123/api')).toThrow(
    /explicit http:\/\/127\.0\.0\.1:<port>/,
  )
  expect(() => normalizeControlledApiBaseUrl('http://127.0.0.1/api')).toThrow(
    /explicit http:\/\/127\.0\.0\.1:<port>/,
  )
})

test('the API guard does not mistake Vite source modules for browser API traffic', () => {
  expect(isControlledApiTransportResourceType('fetch')).toBe(true)
  expect(isControlledApiTransportResourceType('xhr')).toBe(true)
  expect(isControlledApiTransportResourceType('script')).toBe(false)
  expect(isControlledApiTransportResourceType('stylesheet')).toBe(false)
  expect(isControlledApiTransportResourceType('image')).toBe(false)
})
