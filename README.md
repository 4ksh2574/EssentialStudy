# EssentialStudy

An academic organiser and productivity platform for Indian school students (Classes 1–12).

## Current milestone

**Phase 1 — Foundation and visual shell**

- React + TypeScript + Vite
- Motion for React for spring-based UI animation
- Firebase-ready configuration (credentials are supplied locally through environment variables)
- Installable PWA foundation with offline app-shell caching
- Responsive, liquid-inspired interface

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add Firebase web-app configuration to `.env.local` before enabling authentication or cloud sync. Never commit real credentials.

## Scripts

- `npm run dev` — local development
- `npm run build` — type-check and production build
- `npm run preview` — preview the production build

## Deployment

The app is intended for GitHub Pages at:

`https://4ksh2574.github.io/EssentialStudy/`

The Vite base path is configured for this repository. GitHub Pages deployment workflow will be added after the foundation is verified.

## Product principles

- Personal academic data is private by default.
- Offline edits are stored locally and synchronised when connectivity returns.
- Sharing is opt-in and permission-based.
- Respect reduced-motion preferences and keep interactions responsive on mobile.
