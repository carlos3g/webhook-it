import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "webhook-it",
  tagline: "Stable public URLs for webhooks, forwarded in real time to your localhost.",
  favicon: "img/favicon.svg",

  future: {
    v4: true,
  },

  // Deployment target — GitHub Pages project site.
  url: "https://carlos3g.github.io",
  baseUrl: "/webhook-it/",
  organizationName: "carlos3g",
  projectName: "webhook-it",

  onBrokenLinks: "throw",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  markdown: {
    mermaid: true,
    // .md files stay CommonMark (literal `<`, `{`); .mdx opts into MDX.
    format: "detect",
    hooks: {
      onBrokenMarkdownLinks: "warn",
    },
  },
  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/carlos3g/webhook-it/tree/main/website/",
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: "img/logo.svg",
    colorMode: {
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: "mvp",
      content:
        "webhook-it is an MVP in active development — it runs 100% on your machine.",
      backgroundColor: "#0969da",
      textColor: "#ffffff",
      isCloseable: true,
    },
    docs: {
      sidebar: { hideable: true },
    },
    navbar: {
      title: "webhook-it",
      logo: {
        alt: "webhook-it logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Documentation",
        },
        {
          to: "/docs/quick-start",
          label: "Quick Start",
          position: "left",
        },
        {
          to: "/docs/reference/cli",
          label: "CLI Reference",
          position: "left",
        },
        {
          href: "https://github.com/carlos3g/webhook-it",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Getting Started",
          items: [
            { label: "Introduction", to: "/docs/intro" },
            { label: "Installation", to: "/docs/installation" },
            { label: "Quick Start", to: "/docs/quick-start" },
          ],
        },
        {
          title: "Learn",
          items: [
            { label: "How it works", to: "/docs/concepts/how-it-works" },
            { label: "The dashboard", to: "/docs/dashboard/anatomy" },
            { label: "Architecture", to: "/docs/reference/architecture" },
          ],
        },
        {
          title: "Reference",
          items: [
            { label: "CLI", to: "/docs/reference/cli" },
            { label: "Project config schema", to: "/docs/reference/project-config-schema" },
            { label: "Roadmap", to: "/docs/project/roadmap" },
          ],
        },
        {
          title: "More",
          items: [
            { label: "GitHub", href: "https://github.com/carlos3g/webhook-it" },
            { label: "ngrok", href: "https://ngrok.com" },
            { label: "Bun", href: "https://bun.sh" },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} webhook-it. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "sql"],
    },
    mermaid: {
      theme: { light: "neutral", dark: "dark" },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
