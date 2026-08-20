import { useEffect, useMemo, useState } from "react";
import { AccessPage, ConversationalAiPage, CustomEmbedPage, PortfolioPage, SubscriptionsPage } from "./PortalPages.jsx";
import { fetchEmbedSession, fetchIdentities } from "./laasie-api.js";

const PAGES = [
  { id: "portfolio", label: "My Portfolio", eyebrow: "Owner analytics" },
  { id: "ai", label: "Laasie Insights", eyebrow: "Ask your portfolio" },
  { id: "access", label: "Access scopes", eyebrow: "RLS identity guide" },
  { id: "subscriptions", label: "Email subscriptions", eyebrow: "Scheduled delivery" },
  { id: "custom", label: "Custom Embed", eyebrow: "Paste an embed URL" },
];

function NavButton({ page, activePage, onSelect, compact = false }) {
  const active = page.id === activePage;

  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      aria-current={active ? "page" : undefined}
      className={`shrink-0 rounded-xl text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] ${
        compact ? "px-3 py-2" : "w-full px-4 py-3"
      } ${active ? "bg-[var(--color-primary)] text-white shadow-[0_6px_16px_rgba(0,13,69,0.18)]" : "text-[var(--color-text)] hover:bg-[var(--color-hover)] hover:text-[var(--color-text-strong)]"}`}
    >
      {page.label}
    </button>
  );
}

export default function App() {
  const [identities, setIdentities] = useState([]);
  const [activeIdentityId, setActiveIdentityId] = useState("");
  const [activePage, setActivePage] = useState("portfolio");
  const [configState, setConfigState] = useState("loading");
  const [sessionState, setSessionState] = useState("idle");
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [configAttempt, setConfigAttempt] = useState(0);
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);

  const activeIdentity = useMemo(
    () => identities.find((identity) => identity.id === activeIdentityId),
    [activeIdentityId, identities],
  );
  const activePageDetails = PAGES.find((page) => page.id === activePage);

  useEffect(() => {
    document.title = `${activePageDetails.label} | Laasie Partner Portal`;
  }, [activePageDetails.label]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadConfig() {
      setConfigState("loading");
      setError("");

      try {
        const approvedIdentities = await fetchIdentities(controller.signal);
        setIdentities(approvedIdentities);
        setActiveIdentityId((current) => current || approvedIdentities[0].id);
        setConfigState("ready");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setConfigState("error");
          setError(requestError.message || "The portfolio identities could not be loaded.");
        }
      }
    }

    loadConfig();
    return () => controller.abort();
  }, [configAttempt]);

  useEffect(() => {
    if (!activeIdentityId || configState !== "ready") return undefined;

    const controller = new AbortController();

    async function loadSession() {
      setSessionState("loading");
      setSession(null);
      setError("");

      try {
        const nextSession = await fetchEmbedSession(activeIdentityId, controller.signal);
        setSession(nextSession);
        setSessionState("loading-frame");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setSessionState("error");
          setError(requestError.message || "The secure portfolio session could not be created.");
        }
      }
    }

    loadSession();
    return () => controller.abort();
  }, [activeIdentityId, configState, sessionAttempt]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--color-page)] text-[var(--color-text)]">
      <a href="#main-content" className="sr-only fixed left-3 top-3 z-50 rounded-lg bg-[var(--color-card)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] shadow-lg focus:not-sr-only">Skip to content</a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text)] md:flex">
        <div className="border-b border-[var(--color-border)] px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)] text-lg font-bold text-white shadow-[0_8px_24px_rgba(0,13,69,0.2)]" aria-hidden="true">L</div>
            <div>
              <strong className="font-display block text-xl tracking-[-0.04em] text-[var(--color-text-strong)]">Laasie<span className="text-[var(--color-secondary)]">.</span></strong>
              <span className="text-xs text-[var(--color-text-subtle)]">Partner Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-6" aria-label="Primary">
          {PAGES.map((page) => <NavButton key={page.id} page={page} activePage={activePage} onSelect={setActivePage} />)}
        </nav>

        <div className="border-t border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
          <button type="button" onClick={() => setIsPayloadOpen((open) => !open)} aria-expanded={isPayloadOpen} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary-accent)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            {isPayloadOpen ? "Hide" : "Show"} signed access preview
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[0_3px_10px_rgba(0,13,69,0.07)] sm:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">{activePageDetails.eyebrow}</p>
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--color-text-strong)] sm:text-xl">{activePageDetails.label}</h1>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <label htmlFor="identity-select" className="hidden text-xs font-medium text-[var(--color-text-subtle)] sm:block">Viewing as</label>
            <select
              id="identity-select"
              value={activeIdentityId}
              onChange={(event) => setActiveIdentityId(event.target.value)}
              disabled={configState !== "ready"}
              className="min-w-0 max-w-[15rem] cursor-pointer truncate rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] py-2 pl-3 pr-8 text-sm font-semibold text-[var(--color-text-strong)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-hover)] disabled:cursor-wait disabled:opacity-60 sm:max-w-none sm:w-64"
            >
              {identities.map((identity) => <option key={identity.id} value={identity.id}>{identity.name}</option>)}
            </select>
            <button type="button" onClick={() => setIsPayloadOpen((open) => !open)} aria-expanded={isPayloadOpen} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-xs font-semibold text-[var(--color-text)] shadow-sm hover:bg-[var(--color-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] md:hidden">
              JWT
            </button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 md:hidden" aria-label="Primary">
          {PAGES.map((page) => <NavButton key={page.id} page={page} activePage={activePage} onSelect={setActivePage} compact />)}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <main
            id="main-content"
            tabIndex="-1"
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col outline-none ${
              activePage === "portfolio" ? "overflow-hidden" : "overflow-auto p-3 sm:p-5 lg:p-6"
            }`}
          >
            {activePage === "portfolio" && (
              <PortfolioPage
                activeIdentity={activeIdentity}
                configState={configState}
                sessionState={sessionState}
                embedUrl={session?.embedUrl || ""}
                error={error}
                onConfigRetry={() => setConfigAttempt((attempt) => attempt + 1)}
                onSessionRetry={() => setSessionAttempt((attempt) => attempt + 1)}
                onFrameLoad={() => setSessionState("ready")}
              />
            )}
            {activePage === "ai" && (
              <ConversationalAiPage
                activeIdentity={activeIdentity}
                configState={configState}
                sessionState={sessionState}
                aiUrl={session?.aiUrl || ""}
                error={error}
                onConfigRetry={() => setConfigAttempt((attempt) => attempt + 1)}
                onSessionRetry={() => setSessionAttempt((attempt) => attempt + 1)}
                onFrameLoad={() => setSessionState("ready")}
              />
            )}
            {activePage === "access" && <AccessPage identities={identities} />}
            {activePage === "subscriptions" && <SubscriptionsPage activeIdentity={activeIdentity} />}
            {activePage === "custom" && <CustomEmbedPage />}
          </main>

          {isPayloadOpen && (
            <aside className="flex max-h-72 w-full shrink-0 flex-col border-t border-white/15 bg-[var(--color-text-strong)] text-[var(--color-hover)] shadow-2xl xl:max-h-none xl:w-[26rem] xl:border-l xl:border-t-0" aria-label="Signed access preview">
              <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-white">Signed access preview</h2>
                  <p className="mt-0.5 text-xs text-[var(--color-hover)]">Email, token, key and secret omitted</p>
                </div>
                <button type="button" onClick={() => setIsPayloadOpen(false)} className="rounded p-1 text-xl leading-none text-[var(--color-hover)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-secondary)]" aria-label="Close signed access preview">×</button>
              </div>
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-5 text-[var(--color-hover)]">{JSON.stringify(session?.payloadPreview || {}, null, 2)}</pre>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
