import type { ReactNode } from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

function Hero(): ReactNode {
  return (
    <header className={styles.hero}>
      <div className="container">
        <img
          src={useBaseUrl("/img/logo.svg")}
          alt="webhook-it logo"
          className={styles.heroLogo}
          width={84}
          height={84}
        />
        <Heading as="h1" className={styles.heroTitle}>
          webhook-it
        </Heading>
        <p className={styles.heroTagline}>
          Stable public URLs for webhooks, forwarded in real time to your
          localhost — through an interactive terminal dashboard.
        </p>
        <p className={styles.heroSub}>
          Runs 100% on your machine. The only external piece is the ngrok
          tunnel.
        </p>
        <div className={styles.heroButtons}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/quick-start"
          >
            Quick Start · 5 min
          </Link>
        </div>
        <img
          src={useBaseUrl("/img/screens/dashboard-overview.svg")}
          alt="The webhook-it interactive dashboard"
          className={styles.heroShot}
        />
      </div>
    </header>
  );
}

type Feature = { icon: string; title: string; body: ReactNode };

const FEATURES: Feature[] = [
  {
    icon: "🔗",
    title: "A stable public URL",
    body: (
      <>
        Create an endpoint once — its URL is yours until you delete it. Register
        it with Stripe or GitHub without worrying it expires overnight.
      </>
    ),
  },
  {
    icon: "⚡",
    title: "Real-time forwarding",
    body: (
      <>
        Webhooks land on your <code>localhost</code> with every header and body
        byte intact — signatures included. No copy-pasting into Postman.
      </>
    ),
  },
  {
    icon: "⏪",
    title: "History & replay",
    body: (
      <>
        Every event is saved to a local SQLite database. Replay the exact same
        payload — same bytes, same signature — with a single keypress.
      </>
    ),
  },
  {
    icon: "⌨️",
    title: "CLI-first dashboard",
    body: (
      <>
        An interactive terminal dashboard. Watch webhooks arrive live, like{" "}
        <code>tail -f</code> — and never leave your terminal.
      </>
    ),
  },
  {
    icon: "📦",
    title: "Project config",
    body: (
      <>
        Commit a <code>.webhook-it.json</code> and a teammate provisions every
        endpoint with one command: <code>wi apply</code>.
      </>
    ),
  },
  {
    icon: "🔒",
    title: "100% local",
    body: (
      <>
        No account, no cloud, no server to pay for. Everything runs on your
        machine; the only external piece is the tunnel.
      </>
    ),
  },
];

function Features(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          Everything a webhook workflow needs
        </Heading>
        <p className={styles.sectionLede}>
          webhook-it does the full cycle — receive, persist, respond, forward —
          with history and replay built in.
        </p>
        <div className="row">
          {FEATURES.map((f) => (
            <div className="col col--4" key={f.title}>
              <div className={styles.card}>
                <div className={styles.cardIcon}>{f.icon}</div>
                <Heading as="h3" className={styles.cardTitle}>
                  {f.title}
                </Heading>
                <p className={styles.cardBody}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "1",
    title: "Start the daemon",
    body: (
      <>
        Press <kbd>u</kbd> in the dashboard to bring up the local daemon and an
        ngrok tunnel. Your public URL appears in the header.
      </>
    ),
  },
  {
    n: "2",
    title: "Receive & forward",
    body: (
      <>
        A webhook hits your stable URL. webhook-it saves it and forwards it to
        localhost — method, headers and body untouched.
      </>
    ),
  },
  {
    n: "3",
    title: "Inspect & replay",
    body: (
      <>
        Watch events arrive live in the Events pane. When your handler breaks,
        fix it and press <kbd>r</kbd> to replay.
      </>
    ),
  },
];

function HowItWorks(): ReactNode {
  return (
    <section className={clsx(styles.section, styles.sectionAlt)}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          How it works
        </Heading>
        <p className={styles.sectionLede}>
          One running process hosts both the dashboard and the daemon. No IPC,
          no background service.
        </p>
        <div className="row">
          {STEPS.map((s) => (
            <div className="col col--4" key={s.n}>
              <div className={styles.step}>
                <div className={styles.stepNum}>{s.n}</div>
                <Heading as="h3" className={styles.cardTitle}>
                  {s.title}
                </Heading>
                <p className={styles.cardBody}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cta(): ReactNode {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.cta}>
          <Heading as="h2" className={styles.ctaTitle}>
            Ready to stop copy-pasting payloads?
          </Heading>
          <p className={styles.ctaBody}>
            Build the binary, open the dashboard, and watch your first webhook
            arrive in under five minutes.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/quick-start"
            >
              Read the Quick Start
            </Link>
            <Link
              className="button button--outline button--lg"
              href="https://github.com/carlos3g/webhook-it"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Stable public URLs for webhooks"
      description={siteConfig.tagline}
    >
      <Hero />
      <main>
        <Features />
        <HowItWorks />
        <Cta />
      </main>
    </Layout>
  );
}
