/**
 * Generates the terminal-style screenshots and brand assets used across the
 * webhook-it documentation. Everything is rendered as crisp, self-contained SVG
 * so the docs stay lightweight and scale perfectly on any display.
 *
 * Run with:  node scripts/gen-assets.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const IMG = join(HERE, "..", "static", "img");
const SCREENS = join(IMG, "screens");
mkdirSync(SCREENS, { recursive: true });

/* ------------------------------------------------------------------ themes */

// The dashboard uses the real palette from apps/cli/src/theme.ts (GitHub light).
const L = {
  bg: "#ffffff",
  panel: "#f6f8fa",
  border: "#d1d9e0",
  borderActive: "#0969da",
  text: "#1f2328",
  dim: "#656d76",
  accent: "#0969da",
  good: "#1a7f37",
  bad: "#cf222e",
  warn: "#9a6700",
};

// Dark terminal for plain command-line output (GitHub dark inspired).
const D = {
  bg: "#0d1117",
  text: "#c9d1d9",
  dim: "#8b949e",
  green: "#3fb950",
  blue: "#58a6ff",
  yellow: "#d29922",
  red: "#f85149",
  cyan: "#39c5cf",
  bold: "#f0f6fc",
};

const CHROME_LIGHT = { bar: "#eaedf0", line: "#d0d7de", title: "#57606a", edge: "#d0d7de" };
const CHROME_DARK = { bar: "#161b22", line: "#30363d", title: "#7d8590", edge: "#30363d" };

/* ----------------------------------------------------------------- metrics */

const CW = 8.7; // cell width
const CH = 18.6; // cell height
const FS = 14.3; // font size
const PADX = 22;
const PADY = 18;
const BAR = 38; // window title bar
const MARGIN = 34; // transparent room for the drop shadow
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const BOX = { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" };

/** Hard-wraps a string to a width — mirrors how OpenTUI flows long text. */
function wrap(str, width) {
  const out = [];
  for (let i = 0; i < str.length; i += width) out.push(str.slice(i, i + width));
  return out.length ? out : [""];
}

/* -------------------------------------------------------------- grid model */

class Grid {
  constructor(cols, rows, bg, fg) {
    this.cols = cols;
    this.rows = rows;
    this.bg = bg;
    this.cells = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({ ch: " ", fg, bg, bold: false })),
    );
  }
  set(x, y, ch, s) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const c = this.cells[y][x];
    c.ch = ch;
    if (s) {
      if (s.fg) c.fg = s.fg;
      if (s.bg) c.bg = s.bg;
      if (s.bold != null) c.bold = s.bold;
    }
  }
  text(x, y, str, s) {
    const a = [...String(str)];
    for (let i = 0; i < a.length; i++) this.set(x + i, y, a[i], s);
  }
  /** Writes a sequence of [text, fg, bold?] segments starting at x. */
  segs(x, y, segments, bg) {
    let cx = x;
    for (const [t, fg, bold] of segments) {
      this.text(cx, y, t, { fg, bg, bold: Boolean(bold) });
      cx += [...t].length;
    }
  }
  fill(x, y, w, h, bg) {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) this.set(xx, yy, " ", { bg });
  }
  box(x, y, w, h, o = {}) {
    const { fg, bg, title, titleFg } = o;
    if (bg) this.fill(x, y, w, h, bg);
    const bs = { fg, bg };
    this.set(x, y, BOX.tl, bs);
    this.set(x + w - 1, y, BOX.tr, bs);
    this.set(x, y + h - 1, BOX.bl, bs);
    this.set(x + w - 1, y + h - 1, BOX.br, bs);
    for (let xx = x + 1; xx < x + w - 1; xx++) {
      this.set(xx, y, BOX.h, bs);
      this.set(xx, y + h - 1, BOX.h, bs);
    }
    for (let yy = y + 1; yy < y + h - 1; yy++) {
      this.set(x, yy, BOX.v, bs);
      this.set(x + w - 1, yy, BOX.v, bs);
    }
    if (title) this.text(x + 1, y, ` ${title} `, { fg: titleFg || fg, bg, bold: true });
  }
}

/* --------------------------------------------------------------- svg paint */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function renderSVG(grid, { title, chrome }) {
  const winW = Math.round(grid.cols * CW + PADX * 2);
  const winH = Math.round(grid.rows * CH + PADY * 2 + BAR);
  const W = winW + MARGIN * 2;
  const H = winH + MARGIN * 2;
  const p = [];

  p.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" font-size="${FS}">`,
  );
  p.push(
    `<defs><filter id="sh" x="-30%" y="-30%" width="160%" height="160%">` +
      `<feDropShadow dx="0" dy="12" stdDeviation="22" flood-color="#0b1220" flood-opacity="0.30"/>` +
      `</filter></defs>`,
  );
  p.push(`<g transform="translate(${MARGIN},${MARGIN})">`);

  // window
  p.push(
    `<rect x="0" y="0" width="${winW}" height="${winH}" rx="13" fill="${grid.bg}" stroke="${chrome.edge}" stroke-width="1" filter="url(#sh)"/>`,
  );
  // title bar
  p.push(
    `<path d="M0 13 a13 13 0 0 1 13 -13 H ${winW - 13} a13 13 0 0 1 13 13 V ${BAR} H0 Z" fill="${chrome.bar}"/>`,
  );
  p.push(`<line x1="0" y1="${BAR}" x2="${winW}" y2="${BAR}" stroke="${chrome.line}" stroke-width="1"/>`);
  for (const [c, cx] of [["#ff5f56", 22], ["#ffbd2e", 42], ["#27c93f", 62]])
    p.push(`<circle cx="${cx}" cy="${BAR / 2}" r="6" fill="${c}"/>`);
  if (title)
    p.push(
      `<text x="${winW / 2}" y="${BAR / 2 + 0.5}" font-size="12.5" fill="${chrome.title}" text-anchor="middle" dominant-baseline="middle">${esc(title)}</text>`,
    );

  const ox = PADX;
  const oy = BAR + PADY;

  // background runs
  for (let y = 0; y < grid.rows; y++) {
    let x = 0;
    while (x < grid.cols) {
      const bg = grid.cells[y][x].bg;
      let x2 = x;
      while (x2 < grid.cols && grid.cells[y][x2].bg === bg) x2++;
      if (bg && bg !== grid.bg) {
        p.push(
          `<rect x="${(ox + x * CW).toFixed(2)}" y="${(oy + y * CH).toFixed(2)}" width="${((x2 - x) * CW).toFixed(2)}" height="${CH.toFixed(2)}" fill="${bg}"/>`,
        );
      }
      x = x2;
    }
  }

  // text runs — every glyph is pinned to its exact cell x, which keeps the
  // monospace grid perfectly aligned and prevents "--" / "://" ligatures.
  for (let y = 0; y < grid.rows; y++) {
    let x = 0;
    while (x < grid.cols) {
      const c = grid.cells[y][x];
      let x2 = x;
      while (
        x2 < grid.cols &&
        grid.cells[y][x2].fg === c.fg &&
        grid.cells[y][x2].bold === c.bold
      )
        x2++;
      let str = "";
      for (let i = x; i < x2; i++) str += grid.cells[y][i].ch;
      if (str.trim() !== "") {
        const xs = [];
        for (let i = x; i < x2; i++) xs.push((ox + i * CW).toFixed(2));
        const ty = (oy + y * CH + CH * 0.74).toFixed(2);
        p.push(
          `<text x="${xs.join(" ")}" y="${ty}" xml:space="preserve" fill="${c.fg}"${c.bold ? ' font-weight="650"' : ""}>${esc(str)}</text>`,
        );
      }
      x = x2;
    }
  }

  p.push(`</g></svg>`);
  return p.join("\n");
}

function save(name, svg) {
  writeFileSync(join(SCREENS, `${name}.svg`), svg + "\n");
  console.log("  screens/" + name + ".svg");
}

/* ----------------------------------------------------- dashboard composer */

const COLS = 124;
const ROWS = 32;

function dashboard(st) {
  const g = new Grid(COLS, ROWS, L.bg, L.text);

  // header --------------------------------------------------------------
  g.box(0, 0, COLS, 3, { fg: L.border, bg: L.bg });
  g.text(2, 1, "webhook-it", { fg: L.accent, bold: true });
  const mode = st.tunnel ? "tunnel" : "local";
  let statusText, statusColor;
  if (st.daemon === "running") {
    statusText = `running (${mode}) — ${st.publicUrl}`;
    statusColor = L.good;
  } else if (st.daemon === "starting") {
    statusText = `starting (${mode})...`;
    statusColor = L.warn;
  } else if (st.daemon === "error") {
    statusText = `error (${mode})`;
    statusColor = L.bad;
  } else {
    statusText = `stopped (${mode})`;
    statusColor = L.dim;
  }
  g.text(COLS - 2 - statusText.length, 1, statusText, { fg: statusColor });

  // endpoints -----------------------------------------------------------
  g.box(0, 3, 38, 26, { fg: L.border, bg: L.bg, title: "Endpoints", titleFg: L.text });
  if (st.endpoints.length === 0) {
    g.text(2, 5, "no endpoints — press 'n'", { fg: L.dim });
  } else {
    st.endpoints.forEach((ep, i) => {
      const label = (i === st.selected ? "> " : "  ") + ep.name;
      if (i === st.selected) g.text(2, 5 + i, label, { fg: L.bg, bg: L.accent });
      else g.text(2, 5 + i, label, { fg: L.text });
    });
  }
  const sel = st.endpoints[st.selected];
  if (sel) {
    let dy = 5 + st.endpoints.length + 1;
    g.text(2, dy++, "target", { fg: L.dim });
    for (const line of wrap(sel.target, 34)) g.text(2, dy++, line, { fg: L.text });
    g.text(2, dy++, "public url", { fg: L.dim });
    const url = st.publicUrl
      ? `${st.publicUrl}/w/${sel.name}`
      : st.ngrokDomain
        ? `https://${st.ngrokDomain}/w/${sel.name}`
        : "(start the daemon to get a URL)";
    for (const line of wrap(url, 34)) g.text(2, dy++, line, { fg: L.accent });
  }

  // events --------------------------------------------------------------
  const evTitle = sel ? `Events — ${sel.name}` : "Events";
  g.box(38, 3, 86, 26, { fg: L.border, bg: L.bg, title: evTitle, titleFg: L.text });
  if (!st.events || st.events.length === 0) {
    g.text(40, 5, "no events yet — webhooks show up here while the daemon runs", {
      fg: L.dim,
    });
  } else {
    st.events.forEach((ev, i) => {
      const fg = ev.status == null ? L.dim : ev.status < 400 ? L.text : L.bad;
      const route = ev.route.padEnd(12);
      const status = ev.status == null ? "···" : String(ev.status);
      g.text(40, 5 + i, `${ev.time}  ${ev.id}  ${route}  ${status}`, { fg });
    });
  }

  // footer --------------------------------------------------------------
  g.box(0, 29, COLS, 3, { fg: L.border, bg: L.bg });
  g.text(
    2,
    30,
    "up/down select - u start/stop - t mode - n new - c domain - d delete - r replay - q quit",
    { fg: L.dim },
  );
  if (st.statusLine) g.text(COLS - 2 - st.statusLine.length, 30, st.statusLine, { fg: L.dim });

  return g;
}

/** Draws a centered modal (prompt / confirm) on top of an existing grid. */
function overlay(g, { w, h, title, borderColor, lines }) {
  const x = Math.round((COLS - w) / 2);
  const y = Math.round((ROWS - h) / 2);
  g.box(x, y, w, h, { fg: borderColor, bg: L.panel, title, titleFg: L.text });
  lines.forEach((segs, i) => {
    if (segs.length) g.segs(x + 2, y + 2 + i, segs, L.panel);
  });
  return g;
}

const lightChrome = (title) => ({ title, chrome: CHROME_LIGHT });

/* --------------------------------------------------------- shared sample */

const EP3 = [
  { name: "acme-api-stripe", target: "http://localhost:3000/hooks/stripe" },
  { name: "acme-api-github", target: "http://localhost:3000/hooks/github" },
  { name: "billing-prod", target: "http://localhost:8080/billing" },
];
const DOMAIN = "acme.ngrok-free.app";
const PUBLIC = "https://acme.ngrok-free.app";

const STRIPE_EVENTS = [
  { time: "14:32:09", id: "k4m2p9x1c7", route: "POST", status: 200 },
  { time: "14:31:58", id: "a1b2c3d4e5", route: "POST/refunds", status: 200 },
  { time: "14:29:14", id: "z9y8x7w6v5", route: "POST", status: 500 },
  { time: "14:27:02", id: "q1w2e3r4t5", route: "POST", status: null },
  { time: "14:22:40", id: "m5n6b7v8c9", route: "POST", status: 200 },
];

/* ---------------------------------------------------------- 1. dashboards */

// Empty / first impression
save(
  "dashboard-empty",
  renderSVG(
    dashboard({
      endpoints: [],
      selected: 0,
      events: [],
      daemon: "stopped",
      tunnel: false,
      statusLine: "welcome to webhook-it",
    }),
    lightChrome("wi — interactive dashboard"),
  ),
);

// The hero / overview — daemon running over a tunnel
save(
  "dashboard-overview",
  renderSVG(
    dashboard({
      endpoints: EP3,
      selected: 0,
      events: STRIPE_EVENTS,
      daemon: "running",
      tunnel: true,
      ngrokDomain: DOMAIN,
      publicUrl: PUBLIC,
      statusLine: "k4m2p9x1c7 → delivered (200)",
    }),
    lightChrome("wi — interactive dashboard"),
  ),
);

// Local mode
save(
  "dashboard-local",
  renderSVG(
    dashboard({
      endpoints: EP3,
      selected: 0,
      events: [
        { time: "10:05:41", id: "h7j8k9l0m1", route: "POST", status: 200 },
        { time: "10:05:28", id: "n2b3v4c5x6", route: "POST", status: 200 },
      ],
      daemon: "running",
      tunnel: false,
      publicUrl: "http://127.0.0.1:4505",
      statusLine: "local ingest on 127.0.0.1:4505",
    }),
    lightChrome("wi — interactive dashboard"),
  ),
);

// A failed delivery selected
save(
  "dashboard-failed",
  renderSVG(
    dashboard({
      endpoints: EP3,
      selected: 0,
      events: STRIPE_EVENTS,
      daemon: "running",
      tunnel: true,
      ngrokDomain: DOMAIN,
      publicUrl: PUBLIC,
      statusLine: "z9y8x7w6v5 → delivery failed",
    }),
    lightChrome("wi — interactive dashboard"),
  ),
);

/* -------------------------------------------------------------- 2. modals */

// New endpoint form
save(
  "prompt-new-endpoint",
  renderSVG(
    overlay(
      dashboard({
        endpoints: EP3.slice(0, 2),
        selected: 0,
        events: [],
        daemon: "stopped",
        tunnel: true,
        ngrokDomain: DOMAIN,
        statusLine: "creating endpoint",
      }),
      {
        w: 60,
        h: 9,
        title: "New endpoint",
        borderColor: L.borderActive,
        lines: [
          [["Name", L.dim]],
          [["stripe-dev", L.text]],
          [["Target URL", L.accent, true]],
          [["http://localhost:3000/api/webhooks/stripe <", L.text]],
          [["tab: next field - enter: confirm - esc: cancel", L.dim]],
        ],
      },
    ),
    lightChrome("wi — interactive dashboard"),
  ),
);

// First-run ngrok domain prompt
save(
  "prompt-ngrok-domain",
  renderSVG(
    overlay(
      dashboard({
        endpoints: [],
        selected: 0,
        events: [],
        daemon: "stopped",
        tunnel: false,
        statusLine: "welcome to webhook-it",
      }),
      {
        w: 60,
        h: 10,
        title: "ngrok domain",
        borderColor: L.borderActive,
        lines: [
          [["First run — set your ngrok static domain for a stable", L.dim]],
          [["public URL, or press esc to skip and use local mode.", L.dim]],
          [],
          [["Static domain", L.accent, true]],
          [["yourname.ngrok-free.app <", L.dim]],
          [["tab: next field - enter: confirm - esc: cancel", L.dim]],
        ],
      },
    ),
    lightChrome("wi — interactive dashboard"),
  ),
);

// Delete confirmation
save(
  "confirm-delete",
  renderSVG(
    overlay(
      dashboard({
        endpoints: EP3,
        selected: 0,
        events: STRIPE_EVENTS,
        daemon: "stopped",
        tunnel: true,
        ngrokDomain: DOMAIN,
        statusLine: "daemon stopped",
      }),
      {
        w: 56,
        h: 7,
        title: "Confirm",
        borderColor: L.warn,
        lines: [
          [["Delete endpoint 'acme-api-stripe'? Its event history", L.text]],
          [["is kept.", L.text]],
          [["y: yes - n / esc: cancel", L.dim]],
        ],
      },
    ),
    lightChrome("wi — interactive dashboard"),
  ),
);

// Project apply confirmation
save(
  "confirm-apply",
  renderSVG(
    overlay(
      dashboard({
        endpoints: [],
        selected: 0,
        events: [],
        daemon: "stopped",
        tunnel: true,
        ngrokDomain: DOMAIN,
        statusLine: "project 'acme-api': 2 new",
      }),
      {
        w: 56,
        h: 6,
        title: "Confirm",
        borderColor: L.warn,
        lines: [
          [["Apply 2 change(s) from .webhook-it.json?", L.text]],
          [["y: yes - n / esc: cancel", L.dim]],
        ],
      },
    ),
    lightChrome("wi — interactive dashboard"),
  ),
);

/* ----------------------------------------------------- 3. command output */

function darkScreen(name, title, lines) {
  let cols = 0;
  for (const ln of lines) {
    let w = 0;
    for (const [t] of ln) w += [...t].length;
    cols = Math.max(cols, w);
  }
  cols = Math.max(cols + 4, 64);
  const g = new Grid(cols, lines.length + 2, D.bg, D.text);
  lines.forEach((ln, i) => g.segs(2, 1 + i, ln, D.bg));
  writeFileSync(
    join(SCREENS, `${name}.svg`),
    renderSVG(g, { title, chrome: CHROME_DARK }) + "\n",
  );
  console.log("  screens/" + name + ".svg");
}

const PROMPT = (cmd) => [
  ["~/projects/acme-api ", D.cyan],
  ["$ ", D.green],
  [cmd, D.bold, true],
];
const OUT = (t, c = D.text) => [[t, c]];
const BLANK = [[" ", D.bg]];

// wi --help
darkScreen("cmd-help", "zsh — wi --help", [
  PROMPT("wi --help"),
  OUT("webhook-it 0.1.0 — stable public URLs for webhooks, forwarded to your localhost.", D.bold),
  BLANK,
  OUT("Usage:", D.text),
  OUT("  wi            open the interactive dashboard"),
  OUT("  wi apply      create/update endpoints from .webhook-it.json (current project)"),
  BLANK,
  OUT("Run 'wi' with no arguments for the dashboard. 'wi apply' is non-interactive — it"),
  OUT("reconciles the endpoints declared in .webhook-it.json and exits, so a new"),
  OUT("teammate only has to set their ngrok domain and run it."),
  BLANK,
  OUT("Keys inside the dashboard:", D.text),
  [["  up/down or j/k   ", D.cyan], ["move the endpoint selection", D.dim]],
  [["  u                ", D.cyan], ["start / stop the daemon (+ ngrok tunnel)", D.dim]],
  [["  t                ", D.cyan], ["toggle tunnel / local-only mode (while stopped)", D.dim]],
  [["  n                ", D.cyan], ["create a new endpoint", D.dim]],
  [["  c                ", D.cyan], ["set the ngrok domain", D.dim]],
  [["  d                ", D.cyan], ["delete the selected endpoint", D.dim]],
  [["  r                ", D.cyan], ["replay the most recent event of the selected endpoint", D.dim]],
  [["  q                ", D.cyan], ["quit", D.dim]],
  BLANK,
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green]],
]);

// wi apply — fresh
darkScreen("cmd-apply", "zsh — wi apply", [
  PROMPT("wi apply"),
  [["webhook-it — applied ", D.text], ["/Users/dev/projects/acme-api/.webhook-it.json", D.blue]],
  [["project: ", D.text], ["acme-api", D.bold, true]],
  BLANK,
  [["  + ", D.green, true], ["acme-api-stripe  ", D.text], ["http://localhost:3000/webhooks/stripe", D.dim]],
  [["  + ", D.green, true], ["acme-api-github  ", D.text], ["http://localhost:3000/webhooks/github", D.dim]],
  BLANK,
  OUT("2 endpoint(s): 2 created, 0 updated, 0 unchanged", D.text),
  BLANK,
  OUT("run 'wi' to open the dashboard and start the daemon.", D.dim),
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green]],
]);

// wi apply — incremental (update + create + unchanged + orphan)
darkScreen("cmd-apply-changes", "zsh — wi apply", [
  PROMPT("wi apply"),
  [["webhook-it — applied ", D.text], ["/Users/dev/projects/acme-api/.webhook-it.json", D.blue]],
  [["project: ", D.text], ["acme-api", D.bold, true]],
  BLANK,
  [["  ~ ", D.yellow, true], ["acme-api-stripe  ", D.text], ["http://localhost:4000/webhooks/stripe", D.dim]],
  [["  + ", D.green, true], ["acme-api-resend  ", D.text], ["http://localhost:3000/webhooks/resend", D.dim]],
  [["  = ", D.dim, true], ["acme-api-github  ", D.text], ["http://localhost:3000/webhooks/github", D.dim]],
  BLANK,
  OUT("3 endpoint(s): 1 created, 1 updated, 1 unchanged", D.text),
  BLANK,
  OUT("note: 1 endpoint(s) under this namespace are not in the file (kept, not deleted):", D.text),
  [["  ? ", D.cyan, true], ["acme-api-legacy", D.text]],
  BLANK,
  OUT("run 'wi' to open the dashboard and start the daemon.", D.dim),
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green]],
]);

// wi apply — validation error
darkScreen("cmd-apply-error", "zsh — wi apply", [
  PROMPT("wi apply"),
  [["/Users/dev/projects/acme-api/.webhook-it.json", D.blue], [" is invalid:", D.red]],
  OUT("  - endpoints.bad name!: use only letters, numbers, '-' or '_', starting with a", D.red),
  OUT("    letter or number", D.red),
  OUT("  - endpoints.bad name!.target: target must be a valid URL", D.red),
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green], ["echo $?", D.bold, true]],
  OUT("1", D.text),
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green]],
]);

// curl test in local mode
darkScreen("cmd-curl", "zsh — curl", [
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green], ["curl -X POST http://127.0.0.1:4505/w/acme-api-stripe \\", D.bold, true]],
  OUT("       -H 'content-type: application/json' \\", D.bold),
  OUT("       -H 'stripe-signature: t=1700000000,v1=8d9f2c1a...' \\", D.bold),
  OUT("       -d '{\"type\":\"checkout.session.completed\"}'", D.bold),
  BLANK,
  [["{", D.text], ["\"ok\"", D.cyan], [":", D.text], ["true", D.yellow], [",", D.text], ["\"id\"", D.cyan], [":", D.text], ["\"k4m2p9x1c7\"", D.green], ["}", D.text]],
  [["~/projects/acme-api ", D.cyan], ["$ ", D.green]],
]);

// install + build
darkScreen("cmd-build", "zsh — build", [
  [["~/projects/webhook-it ", D.cyan], ["$ ", D.green], ["bun install", D.bold, true]],
  OUT("bun install v1.3.14", D.dim),
  [[" + ", D.green], ["@opentui/core@0.2.14", D.text]],
  [[" + ", D.green], ["@opentui/solid@0.2.14", D.text]],
  [[" + ", D.green], ["solid-js@1.9.13", D.text]],
  [[" + ", D.green], ["zod@3.24.1", D.text]],
  BLANK,
  OUT(" 84 packages installed [1.42s]", D.text),
  BLANK,
  [["~/projects/webhook-it ", D.cyan], ["$ ", D.green], ["bun run build", D.bold, true]],
  OUT("built ./dist/wi", D.green),
  BLANK,
  [["~/projects/webhook-it ", D.cyan], ["$ ", D.green], ["./apps/cli/dist/wi --version", D.bold, true]],
  OUT("0.1.0", D.text),
  [["~/projects/webhook-it ", D.cyan], ["$ ", D.green]],
]);

/* ---------------------------------------------------------- brand assets */

// A clean mark: an event node, a pipe bending into a target — webhook → localhost.
const logo = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3b8bff"/>
      <stop offset="1" stop-color="#0860d3"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#g)"/>
  <path d="M22 31 V40 a6 6 0 0 0 6 6 H43" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>
  <circle cx="22" cy="23" r="8" fill="#ffffff"/>
  <rect x="40" y="38" width="15" height="15" rx="4.5" fill="#ffffff"/>
</svg>
`;

writeFileSync(join(IMG, "logo.svg"), logo(64));
console.log("  logo.svg");
writeFileSync(join(IMG, "favicon.svg"), logo(64));
console.log("  favicon.svg");

console.log("done.");
