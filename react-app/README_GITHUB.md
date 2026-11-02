# FLOWER LIGHT Corporate React v0.3 — source migration

This subdirectory contains the independent React/TypeScript v0.3 source.
The public (GitHub Pages) build MUST NOT expose the local preview editor:
`import.meta.env.DEV` gates `?admin=preview`, so it is only available in development.

Product records are illustrative. Company identity, registration, tax numbers, phone, and WhatsApp
are intentionally blank or labelled DEMO until officially verified. No Supabase keys or old
database connections are included.

From this subdirectory run:
- `npm install` (first time) / `npm ci` once the lockfile is committed
- `npm run typecheck`
- `npm run test:core`
- `npm run build`

The site build is in `dist/`. Its base is relative (`./`) for GitHub Pages deployment.
