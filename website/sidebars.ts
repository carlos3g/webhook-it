import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * The documentation sidebar is defined explicitly so the reading order tells a
 * story: get it running, understand the concepts, learn the dashboard, follow
 * a guide, then dive into the reference.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: ["intro", "installation", "quick-start"],
    },
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      items: [
        "concepts/how-it-works",
        "concepts/endpoints",
        "concepts/events-and-replay",
        "concepts/modes",
        "concepts/project-config",
      ],
    },
    {
      type: "category",
      label: "The Dashboard",
      items: [
        "dashboard/anatomy",
        "dashboard/keybindings",
        "dashboard/managing-endpoints",
        "dashboard/the-daemon",
        "dashboard/replaying",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/local-testing",
        "guides/connecting-a-provider",
        "guides/team-workflow",
        "guides/debugging",
      ],
    },
    {
      type: "category",
      label: "Reference",
      items: [
        "reference/cli",
        "reference/project-config-schema",
        "reference/files-and-config",
        "reference/architecture",
      ],
    },
    {
      type: "category",
      label: "Project",
      items: ["project/roadmap", "project/contributing", "project/faq"],
    },
  ],
};

export default sidebars;
