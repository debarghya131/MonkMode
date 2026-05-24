# MonkMode Deployment Guide

This guide is the final pre-launch checklist for deploying MonkMode safely.

## Architecture

- `client/`: React + Vite frontend
- `server/`: Express + MongoDB backend
- Auth: Clerk
- AI: Groq

## Frontend

Recommended providers:

- Vercel
- Netlify

Build settings:

- Root directory: `client`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Required frontend environment variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_URL`

Example:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_live_xxx
VITE_API_URL=https://your-api-domain.com/api
```

Frontend checks before deploy:

- `npm run lint`
- `npm run build`

## Backend

Recommended providers:

- Render
- Railway

Build and run settings:

- Root directory: `server`
- Install command: `npm install`
- Start command: `npm start`

Required backend environment variables:

- `MONGO_URI`
- `API_KEY`
- `CORS_ORIGINS`

Recommended backend environment variables:

- `NODE_ENV=production`
- `PORT`
- `APP_TIMEZONE=Asia/Kolkata`
- `AI_TIMEOUT_MS=15000`
- `AI_CHAT_RATE_LIMIT_WINDOW_MS=60000`
- `AI_CHAT_RATE_LIMIT_MAX=12`
- `WEEKLY_AI_RATE_LIMIT_WINDOW_MS=60000`
- `WEEKLY_AI_RATE_LIMIT_MAX=12`

Example:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
API_KEY=gsk_xxx
CORS_ORIGINS=https://your-frontend-domain.com
APP_TIMEZONE=Asia/Kolkata
AI_TIMEOUT_MS=15000
AI_CHAT_RATE_LIMIT_WINDOW_MS=60000
AI_CHAT_RATE_LIMIT_MAX=12
WEEKLY_AI_RATE_LIMIT_WINDOW_MS=60000
WEEKLY_AI_RATE_LIMIT_MAX=12
```

Backend checks before deploy:

- `npm run test:goals`
- `node --check server.js`

## Clerk Setup

In Clerk dashboard:

- enable Google sign-in
- set the production frontend domain
- set allowed redirect/callback URLs for your production site

Make sure your production routes match:

- `/login`
- `/signup`
- `/sso-callback`

## CORS Setup

`CORS_ORIGINS` should be a comma-separated list.

Examples:

```env
CORS_ORIGINS=https://monkmode.app
```

or

```env
CORS_ORIGINS=https://monkmode.app,https://www.monkmode.app
```

Do not leave this empty in production.

## Database

Before going live:

- confirm MongoDB network access allows your backend provider
- confirm production `MONGO_URI` points to the correct database
- rotate any old exposed credentials

## AI Safety

The backend now has:

- route rate limiting for Ming chat
- route rate limiting for weekly AI summaries
- request timeouts for Groq calls

Still recommended:

- monitor AI usage after launch
- keep an eye on `API_KEY` billing and quotas

## Manual Smoke Test

Run this after both frontend and backend are deployed.

1. Open landing page.
2. Test `Try Demo`.
3. Confirm demo mode opens dashboard and remains read-only.
4. Test Google sign-in with Clerk.
5. Confirm real authenticated user can access dashboard sections.
6. Create or update:
   - one todo
   - one habit
   - one goal
   - one journal entry
   - one gym item
7. Confirm analysis pages refresh correctly.
8. Confirm weekly report pages load and switch weeks correctly.
9. Confirm AI Guru chat works for a real authenticated user.
10. Confirm logout and login restore the correct account state.

## Known Non-Blocking Note

The app is now code-split, so the earlier giant JS bundle issue is fixed.
However, some image assets are still large, especially branding and landing-page art. The site should work, but image optimization is still a worthwhile next pass.

## Final Go-Live Checklist

- frontend env vars set
- backend env vars set
- Clerk production domain configured
- Google OAuth enabled in Clerk
- MongoDB access verified
- CORS locked to production frontend origin
- lint/build/test checks passed
- manual smoke test passed
- secrets rotated if they were ever exposed during development
