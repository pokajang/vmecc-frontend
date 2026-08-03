# VMECC Frontend

React/Vite frontend for the VMECC application.

## Requirements

- Node.js 24.16.0 LTS (see `.nvmrc`)
- npm

## Setup

```bash
npm install
cp .env.example .env
npm start
```

## Common Commands

```bash
npm start
npm run build
npm run serve
```

The production build is written to `build/`.

## Environment Configuration

All `VITE_*` variables are compiled into browser-delivered assets and are public. Never store API keys, passwords, tokens, private credentials, or other secrets in a `VITE_*` variable.

Local development may use the `.env.example` loopback API URL. A production build requires an explicit, valid HTTPS `VITE_API_URL` and fails when it is missing, malformed, credential-bearing, or points to localhost/loopback. Run `npm run audit:production-config` to verify the checked-in production API and security-header contract without printing environment values.

## Frontend Upgrade Works

The staged frontend quality and reliability upgrade programme is tracked in
[upgrade-works/README.md](./upgrade-works/README.md).
