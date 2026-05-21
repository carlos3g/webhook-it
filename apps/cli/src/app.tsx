import { createSignal, createMemo, createEffect, onMount, onCleanup, For, Show } from "solid-js";
import { render, useKeyboard, useRenderer, useTerminalDimensions } from "@opentui/solid";
import {
  startDaemon,
  writeConfig,
  forwardEvent,
  loadProjectConfig,
  planProjectApply,
  executeProjectApply,
  type Storage,
  type DaemonHandle,
  type WebhookItConfig,
} from "@webhook-it/core";
import { endpointNameSchema, type Endpoint, type WebhookEvent } from "@webhook-it/shared";
import { theme } from "./theme.js";

type DaemonStatus = "stopped" | "starting" | "running" | "error";

interface PromptField {
  key: string;
  label: string;
  value: string;
  placeholder: string;
}

interface PromptState {
  title: string;
  /** optional explanatory lines shown above the fields. */
  hint?: string[];
  fields: PromptField[];
  active: number;
  error?: string;
  /** Returns an error message to keep the prompt open, or null to close it. */
  submit: (values: Record<string, string>) => string | null;
}

interface ConfirmState {
  message: string;
  onYes: () => void;
}

interface KeyLike {
  name: string;
  ctrl?: boolean;
  meta?: boolean;
  sequence?: string;
}

function formatEvent(ev: WebhookEvent): string {
  const time = ev.receivedAt.slice(11, 19);
  const route = ev.method + (ev.pathSuffix ?? "");
  const status = ev.deliveryStatus == null ? "···" : String(ev.deliveryStatus);
  return `${time}  ${ev.id}  ${route.padEnd(12)}  ${status}`;
}

function isPrintable(key: KeyLike): boolean {
  return (
    !key.ctrl &&
    !key.meta &&
    typeof key.sequence === "string" &&
    key.sequence.length === 1 &&
    key.sequence >= " "
  );
}

/** Mounts the interactive dashboard. Kept here so the entry point stays JSX-free. */
export function startDashboard(storage: Storage, config: WebhookItConfig): void {
  void render(() => <App storage={storage} initialConfig={config} />, {
    exitOnCtrlC: false,
  });
}

export function App(props: { storage: Storage; initialConfig: WebhookItConfig }) {
  const renderer = useRenderer();
  const dimensions = useTerminalDimensions();

  const [config, setConfig] = createSignal<WebhookItConfig>(props.initialConfig);
  const [endpoints, setEndpoints] = createSignal<Endpoint[]>(props.storage.listEndpoints());
  const [allEvents, setAllEvents] = createSignal<WebhookEvent[]>(
    props.storage.listEvents(null, 200),
  );
  const [selected, setSelected] = createSignal(0);
  const [daemonStatus, setDaemonStatus] = createSignal<DaemonStatus>("stopped");
  const [publicUrl, setPublicUrl] = createSignal<string | null>(null);
  const [tunnelMode, setTunnelMode] = createSignal(Boolean(props.initialConfig.ngrokDomain));
  const [statusLine, setStatusLine] = createSignal("welcome to webhook-it");
  const [prompt, setPrompt] = createSignal<PromptState | null>(null);
  const [confirm, setConfirm] = createSignal<ConfirmState | null>(null);

  let daemonHandle: DaemonHandle | null = null;

  const selectedEndpoint = createMemo<Endpoint | null>(() => endpoints()[selected()] ?? null);
  const visibleEvents = createMemo<WebhookEvent[]>(() => {
    const ep = selectedEndpoint();
    return ep ? allEvents().filter((e) => e.endpointName === ep.name) : allEvents();
  });
  const eventsCapacity = createMemo(() => Math.max(1, dimensions().height - 10));
  const eventsTitle = createMemo(() => {
    const ep = selectedEndpoint();
    return ep ? `Events — ${ep.name}` : "Events";
  });

  // Keep the selection in range as the endpoint list changes.
  createEffect(() => {
    const count = endpoints().length;
    if (selected() >= count) setSelected(Math.max(0, count - 1));
  });

  // The CLI talks to the same SQLite the daemon writes to; polling keeps the
  // UI in sync whether the daemon runs in this process or not.
  onMount(() => {
    // First run: if the ngrok domain has not been set yet, walk the user
    // through it right away. They can press esc to skip and use local mode.
    if (!props.initialConfig.ngrokDomain) {
      openConfigPrompt(true);
    }

    // If the current directory is a project with a `.webhook-it.json`, offer to
    // apply it — so a teammate gets every endpoint without creating them by hand.
    void offerProjectApply();

    const timer = setInterval(() => {
      setEndpoints(props.storage.listEndpoints());
      setAllEvents(props.storage.listEvents(null, 200));
    }, 400);
    onCleanup(() => {
      clearInterval(timer);
    });
  });

  /**
   * Detects a `.webhook-it.json` and, if it would create or change endpoints,
   * asks the user to confirm. Headless reconcile is `wi apply`; this is the
   * interactive twin, consistent with the first-run domain prompt.
   */
  async function offerProjectApply(): Promise<void> {
    const loaded = await loadProjectConfig().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setStatusLine(message.split("\n")[0] ?? message);
      return null;
    });
    if (!loaded) return;

    const plan = planProjectApply(props.storage, loaded);
    const created = plan.endpoints.filter((e) => e.action === "create").length;
    const updated = plan.endpoints.filter((e) => e.action === "update").length;
    if (created + updated === 0) {
      setStatusLine(
        `project '${plan.project}' — ${String(plan.endpoints.length)} endpoint(s) up to date`,
      );
      return;
    }

    // Wait for any open overlay (e.g. the first-run domain prompt) to be closed.
    while (prompt() || confirm()) {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setStatusLine(
      `project '${plan.project}': ${String(created)} new, ${String(updated)} changed`,
    );
    setConfirm({
      message: `Apply ${String(created + updated)} change(s) from .webhook-it.json?`,
      onYes: () => {
        try {
          // Re-plan at confirm time in case storage changed while the prompt was open.
          const fresh = planProjectApply(props.storage, loaded);
          executeProjectApply(props.storage, fresh);
          setEndpoints(props.storage.listEndpoints());
          const changed = fresh.endpoints.filter((e) => e.action !== "unchanged").length;
          setStatusLine(
            `applied project '${fresh.project}' — ${String(changed)} endpoint(s) set`,
          );
        } catch (err) {
          setStatusLine(err instanceof Error ? err.message : String(err));
        }
      },
    });
  }

  function endpointUrl(ep: Endpoint): string {
    const url = publicUrl();
    if (url) return `${url}/w/${ep.name}`;
    const domain = config().ngrokDomain;
    if (domain) return `https://${domain}/w/${ep.name}`;
    return "(start the daemon to get a URL)";
  }

  async function quit(): Promise<void> {
    if (daemonHandle) {
      try {
        await daemonHandle.stop();
      } catch {
        // ignore — we are exiting anyway
      }
    }
    props.storage.close();
    renderer.destroy();
    process.exit(0);
  }

  async function toggleDaemon(): Promise<void> {
    if (daemonStatus() === "starting") return;

    if (daemonStatus() === "running") {
      setStatusLine("stopping daemon...");
      await daemonHandle?.stop();
      daemonHandle = null;
      setPublicUrl(null);
      setDaemonStatus("stopped");
      setStatusLine("daemon stopped");
      return;
    }

    const cfg = config();
    const useTunnel = tunnelMode();
    if (useTunnel && !cfg.ngrokDomain) {
      setStatusLine("no ngrok domain — press 'c' to set one, or 't' for local mode");
      return;
    }

    setDaemonStatus("starting");
    setStatusLine(useTunnel ? "starting daemon + ngrok tunnel..." : "starting local daemon...");
    try {
      daemonHandle = await startDaemon(
        props.storage,
        cfg,
        {
          onLog: (message) => setStatusLine(message),
          onEvent: (info) =>
            setStatusLine(
              info.matched
                ? `webhook -> ${info.endpointName} (${info.method})`
                : `webhook for unknown endpoint '${info.endpointName}'`,
            ),
        },
        { tunnel: useTunnel },
      );
      setPublicUrl(daemonHandle.publicUrl);
      setDaemonStatus("running");
      setStatusLine(`daemon up — ${daemonHandle.publicUrl}`);
    } catch (err) {
      daemonHandle = null;
      setDaemonStatus("error");
      setStatusLine(err instanceof Error ? err.message : String(err));
    }
  }

  async function replayLatest(): Promise<void> {
    const ep = selectedEndpoint();
    if (!ep) {
      setStatusLine("no endpoint selected");
      return;
    }
    const latest = allEvents().find((e) => e.endpointName === ep.name);
    if (!latest) {
      setStatusLine(`no events for '${ep.name}' yet`);
      return;
    }
    setStatusLine(`replaying ${latest.id}...`);
    const result = await forwardEvent(ep.targetUrl, latest);
    props.storage.markDelivered(latest.id, result.status, result.error);
    setStatusLine(
      result.error
        ? `replay failed: ${result.error}`
        : `replayed ${latest.id} -> ${String(result.status)} (${String(result.latencyMs)}ms)`,
    );
  }

  function openCreatePrompt(): void {
    setPrompt({
      title: "New endpoint",
      active: 0,
      fields: [
        { key: "name", label: "Name", value: "", placeholder: "stripe-dev" },
        {
          key: "target",
          label: "Target URL",
          value: "",
          placeholder: "http://localhost:3000/webhook",
        },
      ],
      submit: (values) => {
        const name = (values.name ?? "").trim();
        const target = (values.target ?? "").trim();
        const parsedName = endpointNameSchema.safeParse(name);
        if (!parsedName.success) {
          return parsedName.error.issues[0]?.message ?? "invalid name";
        }
        try {
          new URL(target);
        } catch {
          return "target is not a valid URL";
        }
        if (props.storage.getEndpoint(name)) return `endpoint '${name}' already exists`;
        props.storage.createEndpoint(name, target);
        setEndpoints(props.storage.listEndpoints());
        setStatusLine(`created endpoint '${name}'`);
        return null;
      },
    });
  }

  function openConfigPrompt(firstRun = false): void {
    setPrompt({
      title: "ngrok domain",
      hint: firstRun
        ? [
            "First run — set your ngrok static domain for a stable",
            "public URL, or press esc to skip and use local mode.",
          ]
        : undefined,
      active: 0,
      fields: [
        {
          key: "domain",
          label: "Static domain",
          value: config().ngrokDomain ?? "",
          placeholder: "yourname.ngrok-free.app",
        },
      ],
      submit: (values) => {
        const domain = (values.domain ?? "").trim();
        const next: WebhookItConfig = { ...config(), ngrokDomain: domain || undefined };
        setConfig(next);
        setTunnelMode(Boolean(domain));
        void writeConfig(next);
        setStatusLine(domain ? `ngrok domain set to ${domain}` : "ngrok domain cleared");
        return null;
      },
    });
  }

  function openDeleteConfirm(): void {
    const ep = selectedEndpoint();
    if (!ep) {
      setStatusLine("no endpoint to delete");
      return;
    }
    setConfirm({
      message: `Delete endpoint '${ep.name}'? Its event history is kept.`,
      onYes: () => {
        props.storage.deleteEndpoint(ep.name);
        setEndpoints(props.storage.listEndpoints());
        setStatusLine(`deleted endpoint '${ep.name}'`);
      },
    });
  }

  function handlePromptKey(key: KeyLike, current: PromptState): void {
    if (key.name === "escape") {
      setPrompt(null);
      return;
    }
    if (key.name === "tab") {
      setPrompt({ ...current, active: (current.active + 1) % current.fields.length });
      return;
    }
    if (key.name === "return") {
      const values = Object.fromEntries(current.fields.map((f) => [f.key, f.value]));
      const error = current.submit(values);
      setPrompt(error ? { ...current, error } : null);
      return;
    }
    if (key.name === "backspace") {
      const fields = current.fields.map((f, i) =>
        i === current.active ? { ...f, value: f.value.slice(0, -1) } : f,
      );
      setPrompt({ ...current, fields, error: undefined });
      return;
    }
    if (isPrintable(key)) {
      const fields = current.fields.map((f, i) =>
        i === current.active ? { ...f, value: f.value + (key.sequence ?? "") } : f,
      );
      setPrompt({ ...current, fields, error: undefined });
    }
  }

  useKeyboard((key: KeyLike) => {
    if (key.ctrl && key.name === "c") {
      void quit();
      return;
    }

    const activePrompt = prompt();
    if (activePrompt) {
      handlePromptKey(key, activePrompt);
      return;
    }

    const activeConfirm = confirm();
    if (activeConfirm) {
      if (key.name === "y") {
        activeConfirm.onYes();
        setConfirm(null);
      } else if (key.name === "n" || key.name === "escape") {
        setConfirm(null);
      }
      return;
    }

    switch (key.name) {
      case "q":
        void quit();
        break;
      case "up":
      case "k":
        setSelected((s) => Math.max(0, s - 1));
        break;
      case "down":
      case "j":
        setSelected((s) => Math.min(endpoints().length - 1, s + 1));
        break;
      case "u":
        void toggleDaemon();
        break;
      case "t":
        if (daemonStatus() === "running" || daemonStatus() === "starting") {
          setStatusLine("stop the daemon before changing mode");
        } else {
          setTunnelMode((m) => !m);
          setStatusLine(`mode: ${tunnelMode() ? "tunnel (ngrok)" : "local only"}`);
        }
        break;
      case "n":
        openCreatePrompt();
        break;
      case "c":
        openConfigPrompt();
        break;
      case "d":
        openDeleteConfirm();
        break;
      case "r":
        void replayLatest();
        break;
      default:
        break;
    }
  });

  const statusColor = createMemo(() => {
    switch (daemonStatus()) {
      case "running":
        return theme.good;
      case "starting":
        return theme.warn;
      case "error":
        return theme.bad;
      default:
        return theme.dim;
    }
  });

  const statusText = createMemo(() => {
    const mode = tunnelMode() ? "tunnel" : "local";
    switch (daemonStatus()) {
      case "running":
        return `running (${mode}) — ${publicUrl() ?? ""}`;
      case "starting":
        return `starting (${mode})...`;
      case "error":
        return `error (${mode})`;
      default:
        return `stopped (${mode})`;
    }
  });

  return (
    <box flexDirection="column" width="100%" height="100%" backgroundColor={theme.bg}>
      <box
        height={3}
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg={theme.accent}>webhook-it</text>
        <text fg={statusColor()}>{statusText()}</text>
      </box>

      <box flexDirection="row" flexGrow={1}>
        <box
          width={38}
          border
          borderStyle="rounded"
          borderColor={theme.border}
          title="Endpoints"
          flexDirection="column"
          padding={1}
        >
          <For each={endpoints()}>
            {(ep, i) => (
              <text
                fg={i() === selected() ? theme.bg : theme.text}
                bg={i() === selected() ? theme.accent : undefined}
              >
                {(i() === selected() ? "> " : "  ") + ep.name}
              </text>
            )}
          </For>
          <Show when={endpoints().length === 0}>
            <text fg={theme.dim}>no endpoints — press 'n'</text>
          </Show>
          <Show when={selectedEndpoint()}>
            {(ep: () => Endpoint) => (
              <box flexDirection="column" marginTop={1}>
                <text fg={theme.dim}>target</text>
                <text fg={theme.text}>{ep().targetUrl}</text>
                <text fg={theme.dim}>public url</text>
                <text fg={theme.accent}>{endpointUrl(ep())}</text>
              </box>
            )}
          </Show>
        </box>

        <box
          flexGrow={1}
          border
          borderStyle="rounded"
          borderColor={theme.border}
          title={eventsTitle()}
          flexDirection="column"
          padding={1}
        >
          <For each={visibleEvents().slice(0, eventsCapacity())}>
            {(ev) => (
              <text
                fg={
                  ev.deliveryStatus == null
                    ? theme.dim
                    : ev.deliveryStatus < 400
                      ? theme.text
                      : theme.bad
                }
              >
                {formatEvent(ev)}
              </text>
            )}
          </For>
          <Show when={visibleEvents().length === 0}>
            <text fg={theme.dim}>no events yet — webhooks show up here while the daemon runs</text>
          </Show>
        </box>
      </box>

      <box
        height={3}
        border
        borderStyle="rounded"
        borderColor={theme.border}
        flexDirection="row"
        justifyContent="space-between"
        paddingLeft={1}
        paddingRight={1}
      >
        <text fg={theme.dim}>
          up/down select - u start/stop - t mode - n new - c domain - d delete - r replay - q quit
        </text>
        <text fg={theme.dim}>{statusLine()}</text>
      </box>

      <Show when={prompt()}>
        {(current: () => PromptState) => (
          <box
            position="absolute"
            left={0}
            top={0}
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
          >
            <box
              width={60}
              border
              borderStyle="rounded"
              borderColor={theme.borderActive}
              backgroundColor={theme.panel}
              flexDirection="column"
              padding={1}
              title={current().title}
            >
              <Show when={current().hint}>
                {(lines: () => string[]) => (
                  <box flexDirection="column" marginBottom={1}>
                    <For each={lines()}>
                      {(line: string) => <text fg={theme.dim}>{line}</text>}
                    </For>
                  </box>
                )}
              </Show>
              <For each={current().fields}>
                {(field, i) => (
                  <box flexDirection="column">
                    <text fg={i() === current().active ? theme.accent : theme.dim}>
                      {field.label}
                    </text>
                    <text fg={field.value ? theme.text : theme.dim}>
                      {(field.value || field.placeholder) +
                        (i() === current().active ? " <" : "")}
                    </text>
                  </box>
                )}
              </For>
              <Show when={current().error}>
                {(error: () => string) => <text fg={theme.bad}>{error()}</text>}
              </Show>
              <text fg={theme.dim}>tab: next field - enter: confirm - esc: cancel</text>
            </box>
          </box>
        )}
      </Show>

      <Show when={confirm()}>
        {(current: () => ConfirmState) => (
          <box
            position="absolute"
            left={0}
            top={0}
            width="100%"
            height="100%"
            alignItems="center"
            justifyContent="center"
          >
            <box
              width={56}
              border
              borderStyle="rounded"
              borderColor={theme.warn}
              backgroundColor={theme.panel}
              flexDirection="column"
              padding={1}
              title="Confirm"
            >
              <text fg={theme.text}>{current().message}</text>
              <text fg={theme.dim}>y: yes - n / esc: cancel</text>
            </box>
          </box>
        )}
      </Show>
    </box>
  );
}
