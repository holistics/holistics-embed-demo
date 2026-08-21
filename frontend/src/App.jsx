import { useEffect, useMemo, useState } from "react";
import { CustomEmbedPage, IdentitiesPage, PortalPage } from "./PortalPages.jsx";
import { fetchEmbedSession, fetchIdentities } from "./scsi-api.js";

const PAGES = [
  { id: "portal", label: "Collections Overview", description: "Accounts and recovery performance", icon: "Activity" },
  { id: "identities", label: "Access & Identity", description: "Governed client and PII access", icon: "User" },
  { id: "custom", label: "Custom Embed", description: "Load an embed URL for comparison", icon: "Link" },
];

const Icons = {
  Activity: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Code: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Link: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  User: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

function NavButton({ page, activePage, onSelect, compact = false }) {
  const Icon = Icons[page.icon];
  const active = page.id === activePage;

  return (
    <button
      type="button"
      onClick={() => onSelect(page.id)}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-3 rounded-md text-left text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] ${
        compact ? "px-3 py-2" : "w-full px-4 py-3"
      } ${
        active
          ? "bg-[var(--color-primary)] text-white shadow-[0_8px_18px_rgba(1,90,170,0.18)]"
          : "text-[var(--color-text)] hover:bg-[var(--color-hover)] hover:text-[var(--color-primary-deep)]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {page.label}
    </button>
  );
}

export default function App() {
  const [identities, setIdentities] = useState([]);
  const [activeIdentityId, setActiveIdentityId] = useState("");
  const [activePage, setActivePage] = useState("portal");
  const [customEmbedUrl, setCustomEmbedUrl] = useState("");
  const [customEmbedLoaded, setCustomEmbedLoaded] = useState("");
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
    document.title = `${activePageDetails.label} | State Client Portal`;
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
          setError(requestError.message || "The client list could not be loaded.");
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
          setError(requestError.message || "The dashboard session could not be created.");
        }
      }
    }

    loadSession();
    return () => controller.abort();
  }, [activeIdentityId, configState, sessionAttempt]);

  function loadCustomEmbed() {
    if (customEmbedUrl.trim()) setCustomEmbedLoaded(customEmbedUrl.trim());
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[var(--color-page)] text-[var(--color-text)]">
      <a href="#main-content" className="sr-only fixed left-3 top-3 z-50 rounded-md bg-white px-4 py-2 text-sm font-semibold text-[var(--color-primary)] shadow-lg focus:not-sr-only">Skip to content</a>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-white md:flex">
        <div className="border-b border-[var(--color-border)] px-6 py-5">
          <img src="/state-logo.svg" alt="State Collection Service, Inc." className="h-auto w-[6.75rem]" />
          <p className="mt-2 text-xs font-semibold tracking-wide text-[var(--color-text-subtle)]">Client Analytics Portal</p>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-6" aria-label="Primary">
          {PAGES.map((page) => (
            <NavButton key={page.id} page={page} activePage={activePage} onSelect={setActivePage} />
          ))}
        </nav>

        <div className="border-t border-[var(--color-border)] bg-[var(--color-canvas)] p-4">
          <button
            type="button"
            onClick={() => setIsPayloadOpen((open) => !open)}
            aria-expanded={isPayloadOpen}
            className="flex w-full items-center gap-2 rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
          >
            <Icons.Code className="h-4 w-4" />
            {isPayloadOpen ? "Hide" : "Show"} signed access preview
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-h-7 shrink-0 items-center justify-between bg-[var(--color-primary-deep)] px-4 text-[0.6875rem] font-medium tracking-wide text-blue-50 sm:px-6 lg:px-8">
          <span>State Collection Service, Inc.</span>
          <span className="hidden text-cyan-100 sm:inline">Healthcare receivables intelligence</span>
        </div>

        <header className="z-20 flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-white px-4 py-3 shadow-[0_3px_12px_rgba(0,55,103,0.07)] sm:px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[var(--color-text-strong)] sm:text-xl">{activePageDetails.label}</h1>
            <p className="truncate text-xs text-[var(--color-text-subtle)]">{activePageDetails.description}</p>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <label htmlFor="identity-select" className="hidden text-xs font-medium text-[var(--color-text-subtle)] sm:block">Viewing as</label>
            <select
              id="identity-select"
              value={activeIdentityId}
              onChange={(event) => setActiveIdentityId(event.target.value)}
              disabled={configState !== "ready"}
              className="min-w-0 max-w-[15rem] cursor-pointer truncate rounded-md border border-[var(--color-border-strong)] bg-white py-2 pl-3 pr-8 text-sm font-semibold text-[var(--color-text-strong)] shadow-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-hover)] disabled:cursor-wait disabled:opacity-60 sm:w-80 sm:max-w-none"
            >
              {identities.map((identity) => <option key={identity.id} value={identity.id}>{identity.name}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setIsPayloadOpen((open) => !open)}
              aria-expanded={isPayloadOpen}
              className="rounded-md border border-[var(--color-border-strong)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-primary)] shadow-sm hover:bg-[var(--color-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] md:hidden"
            >
              Access
            </button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-white px-3 py-2 md:hidden" aria-label="Primary">
          {PAGES.map((page) => (
            <NavButton key={page.id} page={page} activePage={activePage} onSelect={setActivePage} compact />
          ))}
        </nav>

        <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <main
            id="main-content"
            tabIndex="-1"
            className={`relative flex min-h-0 min-w-0 flex-1 flex-col outline-none ${
              activePage === "portal" ? "overflow-hidden" : "overflow-auto p-3 sm:p-5 lg:p-6"
            }`}
          >
            {activePage === "portal" && (
              <PortalPage
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
            {activePage === "identities" && <IdentitiesPage identities={identities} />}
            {activePage === "custom" && (
              <CustomEmbedPage
                url={customEmbedUrl}
                loadedUrl={customEmbedLoaded}
                onUrlChange={setCustomEmbedUrl}
                onLoad={loadCustomEmbed}
                onCopy={() => customEmbedLoaded && navigator.clipboard.writeText(customEmbedLoaded)}
                onClear={() => { setCustomEmbedUrl(""); setCustomEmbedLoaded(""); }}
              />
            )}
          </main>

          {isPayloadOpen && (
            <aside className="flex max-h-72 w-full shrink-0 flex-col border-t border-white/15 bg-[var(--color-primary-deep)] text-blue-50 shadow-2xl xl:max-h-none xl:w-[26rem] xl:border-l xl:border-t-0" aria-label="Signed access preview">
              <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><Icons.Code className="h-4 w-4 text-[var(--color-accent)]" />Signed access preview</h2>
                  <p className="mt-0.5 text-xs text-cyan-100">Token, key and secret omitted</p>
                </div>
                <button type="button" onClick={() => setIsPayloadOpen(false)} className="rounded p-1 text-xl leading-none text-blue-100 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]" aria-label="Close signed access preview">×</button>
              </div>
              <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-5 text-blue-50">{JSON.stringify(session?.payloadPreview || {}, null, 2)}</pre>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
