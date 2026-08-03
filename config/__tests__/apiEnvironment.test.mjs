import { describe, expect, it } from 'vitest'
import {
  DEVELOPMENT_API_BASE_URL,
  resolveApiBaseUrl,
  validateProductionEnvironment,
} from '../apiEnvironment.mjs'

describe('API environment configuration', () => {
  it('keeps the localhost fallback only for explicit development mode', () => {
    expect(resolveApiBaseUrl({ configuredUrl: '', isDevelopment: true })).toBe(
      DEVELOPMENT_API_BASE_URL,
    )
    expect(() => resolveApiBaseUrl({ configuredUrl: '', isDevelopment: false })).toThrow(
      /required outside development/i,
    )
  })

  it('normalizes an explicitly configured API URL', () => {
    expect(
      resolveApiBaseUrl({ configuredUrl: ' https://api.example.test/api/ ', isDevelopment: false }),
    ).toBe('https://api.example.test/api')
  })

  it('accepts an explicit non-loopback HTTPS production API URL', () => {
    expect(() =>
      validateProductionEnvironment({
        command: 'build',
        mode: 'production',
        env: { VITE_API_URL: 'https://api.example.test/api' },
      }),
    ).not.toThrow()
  })

  it.each([
    ['', /VITE_API_URL is required/i],
    ['not-a-url', /valid absolute HTTPS URL/i],
    ['http://api.example.test/api', /must use HTTPS/i],
    ['https://localhost:8000/api', /must not target localhost/i],
    ['https://api.localhost/api', /must not target localhost/i],
    ['https://localhost.:8000/api', /must not target localhost/i],
    ['https://127.0.0.1:8000/api', /must not target localhost/i],
    ['https://127.0.0.2:8000/api', /must not target localhost/i],
    ['https://[::1]:8000/api', /must not target localhost/i],
    ['https://user:password@api.example.test/api', /must not contain credentials/i],
    ['https://api.example.test/api?debug=1', /must not contain a query string/i],
  ])('rejects unsafe production VITE_API_URL value %j', (value, message) => {
    expect(() =>
      validateProductionEnvironment({
        command: 'build',
        mode: 'production',
        env: { VITE_API_URL: value },
      }),
    ).toThrow(message)
  })

  it('does not confuse a normal domain containing the word localhost with loopback', () => {
    expect(() =>
      validateProductionEnvironment({
        command: 'build',
        mode: 'production',
        env: { VITE_API_URL: 'https://localhost.example.test/api' },
      }),
    ).not.toThrow()
  })

  it('does not apply production restrictions to the development server', () => {
    expect(() =>
      validateProductionEnvironment({
        command: 'serve',
        mode: 'development',
        env: { VITE_API_URL: 'http://localhost:8000/api' },
      }),
    ).not.toThrow()
  })
})
