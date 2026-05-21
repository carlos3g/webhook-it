# webhook-it documentation site

The documentation site for **webhook-it**, built with
[Docusaurus](https://docusaurus.io/). The published content lives in `docs/`;
the landing page is `src/pages/index.tsx`.

## Local development

```bash
npm install
npm start
```

Starts a dev server with hot reload at <http://localhost:3000/webhook-it/>.

## Build

```bash
npm run build      # static site into ./build
npm run serve      # preview the built site locally
```

## Screenshots

The terminal screenshots in `static/img/screens/` are **generated**, not
captured. They are rendered as self-contained SVG by:

```bash
node scripts/gen-assets.mjs
```

The same script produces `static/img/logo.svg` and `static/img/favicon.svg`.
Re-run it after editing the script, then rebuild the site.

## Structure

```
website/
├── docs/                 the documentation pages (Markdown)
│   ├── concepts/          core concepts
│   ├── dashboard/         the interactive dashboard
│   ├── guides/            task-oriented guides
│   ├── reference/         CLI, config and architecture reference
│   └── project/           roadmap, contributing, FAQ
├── src/
│   ├── pages/index.tsx    the landing page
│   └── css/custom.css     global styles
├── scripts/gen-assets.mjs the screenshot + brand-asset generator
├── static/img/            logo, favicon and generated screenshots
├── docusaurus.config.ts   site configuration
└── sidebars.ts            the documentation sidebar
```

## Deployment

Configured for GitHub Pages as a project site
(`carlos3g.github.io/webhook-it/`). Adjust `url` / `baseUrl` in
`docusaurus.config.ts` for any other host.
