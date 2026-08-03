import js from '@eslint/js'
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

const javascriptFiles = ['**/*.{js,jsx,mjs,cjs}']
const sourceFiles = ['src/**/*.{js,jsx}']
const testFiles = [
  'src/**/__tests__/**/*.{js,jsx}',
  'src/**/*.test.{js,jsx}',
  'src/test/**/*.{js,jsx}',
]
const nodeFiles = ['*.{js,mjs,cjs}', 'scripts/**/*.{js,mjs,cjs}', 'tests/**/*.{js,mjs,cjs}']

export default [
  {
    ignores: [
      'build/**',
      'coverage/**',
      '.codex-run/**',
      '.qa-runtime/**',
      'playwright-report/**',
      'smoke-artifacts/**',
      'test-results/**',
    ],
  },
  {
    files: javascriptFiles,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      // Ratchet this on by directory after the existing backlog is cleared.
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: sourceFiles,
    plugins: {
      react: eslintPluginReact,
      'react-hooks': eslintPluginReactHooks,
      'jsx-a11y': eslintPluginJsxA11y,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...eslintPluginReact.configs.flat.recommended.rules,
      ...eslintPluginReact.configs.flat['jsx-runtime'].rules,
      ...eslintPluginReactHooks.configs.recommended.rules,
      // Prop validation requires a dedicated migration because this JavaScript codebase
      // currently has neither PropTypes coverage nor a static type system.
      'react/prop-types': 'off',
      'react/button-has-type': 'error',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
    },
  },
  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.vitest,
      },
    },
  },
  {
    files: nodeFiles,
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['tests/e2e/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  {
    files: ['src/service-worker/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        __VMECC_SW_BUILD_ID__: 'readonly',
        __VMECC_SW_PRECACHE_ASSETS__: 'readonly',
      },
    },
  },
  eslintPluginPrettierRecommended,
]
