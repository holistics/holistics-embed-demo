import { useState } from "react";

function LoadingState({ message }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-canvas)]" role="status">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--color-hover)] border-t-[var(--color-primary)] motion-reduce:animate-none" aria-hidden="true" />
      <span className="mt-4 text-sm font-medium text-[var(--color-text)]">{message}</span>
    </div>
  );
}

function ErrorState({ title = "Portfolio unavailable", message, onRetry }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-6 text-center" role="alert">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-negative-fill)] text-lg text-[var(--color-negative-text)]" aria-hidden="true">!</div>
      <div>
        <strong className="block text-sm text-[var(--color-text-strong)]">{title}</strong>
        <p className="mt-1 max-w-lg text-sm leading-6 text-[var(--color-negative-text)]">{message}</p>
      </div>
      <button type="button" onClick={onRetry} className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-text-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
        Try again
      </button>
    </div>
  );
}

export function PortfolioPage({
  activeIdentity,
  configState,
  sessionState,
  embedUrl,
  error,
  onConfigRetry,
  onSessionRetry,
  onFrameLoad,
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[var(--color-card)]" aria-busy={sessionState !== "ready"}>
        {configState === "loading" && <LoadingState message="Loading approved identities…" />}
        {configState === "error" && <ErrorState message={error} onRetry={onConfigRetry} />}
        {configState === "ready" && ["loading", "loading-frame"].includes(sessionState) && <LoadingState message="Opening Laasie — My Portfolio…" />}
        {sessionState === "error" && <ErrorState message={error} onRetry={onSessionRetry} />}
        {embedUrl && (
          <iframe
            key={embedUrl}
            src={embedUrl}
            className="block h-full min-h-0 w-full flex-1 border-0"
            title={`Laasie My Portfolio for ${activeIdentity?.name || "selected portfolio"}`}
            allow="clipboard-read; clipboard-write"
            onLoad={onFrameLoad}
          />
        )}
      </div>
    </div>
  );
}

export function ConversationalAiPage({
  activeIdentity,
  configState,
  sessionState,
  aiUrl,
  error,
  onConfigRetry,
  onSessionRetry,
  onFrameLoad,
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative flex min-h-[34rem] flex-1 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_18px_60px_-32px_rgba(0,13,69,0.22)]" aria-busy={sessionState !== "ready"}>
        {configState === "loading" && <LoadingState message="Loading approved identities…" />}
        {configState === "error" && <ErrorState title="Conversational AI unavailable" message={error} onRetry={onConfigRetry} />}
        {configState === "ready" && ["loading", "loading-frame"].includes(sessionState) && <LoadingState message="Opening portfolio AI…" />}
        {sessionState === "error" && <ErrorState title="Conversational AI unavailable" message={error} onRetry={onSessionRetry} />}
        {aiUrl && (
          <iframe
            key={aiUrl}
            src={aiUrl}
            className="h-full min-h-[34rem] w-full flex-1 border-0"
            title={`Laasie conversational AI for ${activeIdentity?.name || "selected portfolio"}`}
            allow="clipboard-read; clipboard-write"
            onLoad={onFrameLoad}
          />
        )}
      </div>
    </div>
  );
}

export function AccessPage({ identities }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 overflow-auto pb-4">
      <section className="overflow-hidden rounded-3xl bg-[var(--color-primary)] text-white shadow-[0_18px_45px_rgba(0,13,69,0.2)]">
        <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_0.9fr] md:p-8">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Access contract</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">One signed attribute shapes every portfolio query.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-50">The browser selects a known identity. The server—not the browser—maps it to the approved <code className="rounded bg-white/15 px-1.5 py-0.5 font-mono text-white">company_id</code> values and signs the Embed Portal session.</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-blue-50 shadow-inner" role="img" aria-labelledby="identity-flow-title identity-flow-description">
            <p id="identity-flow-title" className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-blue-100">Signed identity flow</p>
            <p id="identity-flow-description" className="sr-only">The browser sends a known identity to the server. The server maps it to approved company IDs. Holistics matches those IDs to owner groups and returns only scoped rows, filters, and exports.</p>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)] grid-rows-[auto_1.5rem_auto] items-center" aria-hidden="true">
              <div className="col-start-1 row-start-1 min-w-0 rounded-xl border border-white/25 bg-[var(--color-card)] p-3 text-[var(--color-primary)] shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] font-mono text-[0.625rem] font-bold text-white">1</span>
                <strong className="mt-2 block text-xs text-[var(--color-text-strong)]">Browser</strong>
                <span className="mt-0.5 block truncate font-mono text-[0.625rem] text-[var(--color-text)]">identity_id</span>
              </div>

              <svg className="col-start-2 row-start-1 mx-auto h-4 w-5 text-white" viewBox="0 0 20 16" fill="none">
                <path d="M1 8h16m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="col-start-3 row-start-1 min-w-0 rounded-xl border border-white/25 bg-[var(--color-card)] p-3 text-[var(--color-primary)] shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] font-mono text-[0.625rem] font-bold text-white">2</span>
                <strong className="mt-2 block text-xs text-[var(--color-text-strong)]">Approved scope</strong>
                <span className="mt-0.5 block truncate font-mono text-[0.625rem] text-[var(--color-text)]">company_id[]</span>
              </div>

              <svg className="col-start-3 row-start-2 mx-auto h-5 w-4 text-white" viewBox="0 0 16 20" fill="none">
                <path d="M8 1v16m-5-5 5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="col-start-3 row-start-3 min-w-0 rounded-xl border border-white/25 bg-[var(--color-card)] p-3 text-[var(--color-primary)] shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)] font-mono text-[0.625rem] font-bold text-white">3</span>
                <strong className="mt-2 block text-xs text-[var(--color-text-strong)]">Holistics RLS</strong>
                <span className="mt-0.5 block truncate font-mono text-[0.625rem] text-[var(--color-text)]">owner_group_id</span>
              </div>

              <svg className="col-start-2 row-start-3 mx-auto h-4 w-5 text-white" viewBox="0 0 20 16" fill="none">
                <path d="M19 8H3m5-5L3 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              <div className="col-start-1 row-start-3 min-w-0 rounded-xl border border-[var(--color-positive-fill)] bg-[var(--color-positive-fill)] p-3 text-[var(--color-positive-text)] shadow-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-positive-text)] font-mono text-[0.625rem] font-bold text-white">4</span>
                <strong className="mt-2 block text-xs text-[var(--color-text-strong)]">Scoped result</strong>
                <span className="mt-0.5 block truncate text-[0.625rem] text-[var(--color-positive-text)]">Rows · filters · exports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[0_3px_10px_rgba(0,13,69,0.07)]">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Identity matrix</p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--color-text-strong)]">Approved demo scopes</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-subtle)]">Cardinal Peak is the portfolio-wide operator view requested for this demo. Sable Point proves the narrower tenant view over the same dashboard.</p>

        <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Approved Laasie identities and their signed owner-group scopes</caption>
            <thead className="bg-[var(--color-page)] text-[var(--color-text-strong)]">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Viewing as</th>
                <th scope="col" className="px-5 py-3 font-semibold">Signed attribute</th>
                <th scope="col" className="px-5 py-3 font-semibold">Expected portfolio</th>
                <th scope="col" className="px-5 py-3 font-semibold">Other rows</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {identities.map((identity) => (
                <tr key={identity.id}>
                  <th scope="row" className="px-5 py-4 font-semibold text-[var(--color-text-strong)]">{identity.name}</th>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--color-primary)]">company_id: [{identity.companyIds.join(", ")}]</td>
                  <td className="px-5 py-4 text-[var(--color-text-subtle)]">{identity.companyIds.length > 1 ? "All 6 source owner groups" : "Sable Point Collection only"}</td>
                  <td className="px-5 py-4"><span className="rounded-full bg-[var(--color-positive-fill)] px-2.5 py-1 text-xs font-semibold text-[var(--color-positive-text)]">Outside scope excluded</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function SubscriptionsPage({ activeIdentity }) {
  const steps = [
    ["01", "Open Export & schedule", "In the embedded dashboard, open Export & schedule and choose Subscribe via email."],
    ["02", "Choose the schedule", "Set the cadence, delivery time, timezone, filters, and rendered attachment format."],
    ["03", "Keep the same scope", "Holistics stores this embed user’s signed identity and company_id scope for scheduled delivery."],
  ];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 overflow-auto pb-4">
      <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-6 shadow-[0_3px_10px_rgba(0,13,69,0.07)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-primary)]">Email subscriptions</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-text-strong)]">Portfolio reporting, delivered on schedule.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-subtle)]">Each identity has a fixed server-controlled recipient. Embed users can choose when the report runs, but cannot redirect delivery or replace the signed access scope.</p>
          </div>
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 shadow-[0_3px_10px_rgba(0,13,69,0.07)]">
            <span className="block text-xs text-[var(--color-text-subtle)]">Current stored context</span>
            <strong className="mt-1 block text-sm text-[var(--color-text-strong)]">{activeIdentity?.name || "Selected identity"}</strong>
            <span className="mt-2 block font-mono text-xs text-[var(--color-primary)]">company_id: [{activeIdentity?.companyIds.join(", ") || "…"}]</span>
          </div>
        </div>
      </section>

      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(([number, title, copy]) => (
          <li key={number} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_3px_10px_rgba(0,13,69,0.07)]">
            <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">{number}</span>
            <h3 className="mt-3 font-semibold text-[var(--color-text-strong)]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--color-text-subtle)]">{copy}</p>
          </li>
        ))}
      </ol>

      <section className="grid overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_3px_10px_rgba(0,13,69,0.07)] md:grid-cols-3">
        <div className="border-b border-[var(--color-border)] p-5 md:border-b-0 md:border-r">
          <span className="text-lg text-[var(--color-positive-text)]" aria-hidden="true">✓</span>
          <h3 className="mt-2 font-semibold text-[var(--color-text-strong)]">Dashboard export enabled</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text)]">Rendered dashboard formats are available for scheduled delivery.</p>
        </div>
        <div className="border-b border-[var(--color-border)] p-5 md:border-b-0 md:border-r">
          <span className="text-lg text-[var(--color-positive-text)]" aria-hidden="true">✓</span>
          <h3 className="mt-2 font-semibold text-[var(--color-text-strong)]">Subscriptions enabled</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text)]">Stable embed user IDs allow users to create and manage schedules.</p>
        </div>
        <div className="p-5">
          <span className="text-lg text-[var(--color-positive-text)]" aria-hidden="true">✓</span>
          <h3 className="mt-2 font-semibold text-[var(--color-text-strong)]">Raw data export enabled</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--color-text)]">CSV and Excel downloads retain the signed portfolio scope.</p>
        </div>
      </section>
    </div>
  );
}

export function CustomEmbedPage() {
  const [draftUrl, setDraftUrl] = useState("");
  const [loadedUrl, setLoadedUrl] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  function loadEmbed(event) {
    event.preventDefault();
    setError("");

    try {
      const url = new URL(draftUrl.trim());

      if (url.protocol !== "https:") {
        throw new Error("Use an HTTPS embed URL.");
      }

      setLoadedUrl(url.toString());
      setStatus("Opening custom embed preview.");
    } catch (urlError) {
      setError(urlError.message === "Use an HTTPS embed URL." ? urlError.message : "Enter a valid HTTPS embed URL.");
      setStatus("");
    }
  }

  async function copyEmbedUrl() {
    try {
      await navigator.clipboard.writeText(loadedUrl);
      setError("");
      setStatus("Embed URL copied.");
    } catch {
      setError("The browser could not copy the URL. Select it in the field and copy it manually.");
      setStatus("");
    }
  }

  function clearEmbed() {
    setDraftUrl("");
    setLoadedUrl("");
    setError("");
    setStatus("Custom embed cleared.");
  }

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <form onSubmit={loadEmbed} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[0_3px_10px_rgba(0,13,69,0.07)]">
        <label htmlFor="custom-embed-url" className="block text-sm font-semibold text-[var(--color-text-strong)]">Embed URL</label>
        <p id="custom-embed-hint" className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">HTTPS only. The destination must permit iframe embedding.</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
          <textarea
            id="custom-embed-url"
            value={draftUrl}
            onChange={(event) => setDraftUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            aria-describedby="custom-embed-hint"
            placeholder="https://example.holistics.io/embed/..."
            rows={2}
            required
            autoComplete="off"
            spellCheck="false"
            className="min-h-20 flex-1 resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] px-4 py-3 font-mono text-xs leading-5 text-[var(--color-text-strong)] shadow-inner outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-hover)]"
          />
          <div className="flex flex-wrap gap-2 lg:pt-1">
            <button type="submit" className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,13,69,0.18)] transition-colors hover:bg-[var(--color-text-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">Load</button>
            <button type="button" onClick={copyEmbedUrl} disabled={!loadedUrl} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary-accent)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-45">Copy URL</button>
            <button type="button" onClick={clearEmbed} disabled={!draftUrl && !loadedUrl} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary-accent)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-45">Clear</button>
          </div>
        </div>
        {error && <p className="mt-3 text-sm font-medium text-[var(--color-negative-text)]" role="alert">{error}</p>}
        <p className="sr-only" aria-live="polite">{status}</p>
      </form>

      <section className="flex min-h-[34rem] flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_18px_60px_-32px_rgba(0,13,69,0.22)]" aria-label="Custom embed preview">
        <div className="flex min-h-11 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <span className="min-w-0 flex-1 truncate rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-center font-mono text-[0.6875rem] text-[var(--color-text-subtle)]" title={loadedUrl || undefined}>{loadedUrl || "No custom URL loaded"}</span>
        </div>

        {loadedUrl ? (
          <iframe
            key={loadedUrl}
            src={loadedUrl}
            title="Custom embed preview"
            className="min-h-[31rem] w-full flex-1 border-0"
            sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            onLoad={() => setStatus("Custom embed preview loaded.")}
            onError={() => setError("The destination could not be embedded. Check its URL and framing policy.")}
          />
        ) : (
          <div className="grid min-h-[31rem] flex-1 place-items-center bg-[var(--color-canvas)] px-6 text-center">
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-[var(--color-text-strong)]">Your preview will appear here</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-subtle)]">Paste a signed embed URL above and choose Load. Use Shift+Enter if the URL field needs a line break.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
