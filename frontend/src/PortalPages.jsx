function LoadingState({ message }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--color-canvas)]" role="status">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-[var(--color-hover)] border-t-[var(--color-primary)] motion-reduce:animate-none" aria-hidden="true" />
      <span className="mt-4 text-sm font-medium text-[var(--color-text)]">{message}</span>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-6 text-center" role="alert">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-negative-fill)] text-lg font-bold text-[var(--color-negative-text)]" aria-hidden="true">!</div>
      <p className="max-w-lg text-sm leading-6 text-[var(--color-negative-text)]">{message}</p>
      <button type="button" onClick={onRetry} className="rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]">
        Try again
      </button>
    </div>
  );
}

function BrowserFrame({ address, children }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-[var(--color-border)] bg-white shadow-[0_12px_36px_-24px_rgba(0,55,103,0.35)]">
      <div className="flex min-h-10 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-canvas)] px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
        </div>
        <div className="mx-auto max-w-md flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded border border-[var(--color-border)] bg-white px-4 py-1 text-center font-mono text-xs text-[var(--color-text-subtle)]">
          {address}
        </div>
      </div>
      {children}
    </div>
  );
}

export function PortalPage({
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
    <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden bg-white" aria-busy={sessionState !== "ready"}>
      {configState === "loading" && <LoadingState message="Loading approved client access…" />}
      {configState === "error" && <ErrorState message={error} onRetry={onConfigRetry} />}
      {configState === "ready" && ["loading", "loading-frame"].includes(sessionState) && <LoadingState message="Opening collections overview…" />}
      {sessionState === "error" && <ErrorState message={`${error}. Please retry.`} onRetry={onSessionRetry} />}
      {embedUrl && (
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="absolute inset-0 h-full w-full border-0"
          title={`SCSI collections overview for ${activeIdentity?.name || "selected client"}`}
          allow="clipboard-read; clipboard-write"
          onLoad={onFrameLoad}
        />
      )}
    </div>
  );
}

export function IdentitiesPage({ identities }) {
  return (
    <div className="mx-auto w-full max-w-6xl overflow-auto rounded-md border border-[var(--color-border)] bg-white shadow-[0_12px_36px_-24px_rgba(0,55,103,0.35)]">
      <div className="grid gap-4 border-b border-[var(--color-border)] bg-[var(--color-canvas)] p-5 md:grid-cols-2 md:p-6">
        <section className="rounded-md border border-blue-200 bg-blue-50 p-4">
          <h2 className="font-semibold text-[var(--color-primary-deep)]">Row-level permission</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">The signed <code className="rounded bg-blue-100 px-1 py-0.5">scsi_client_id</code> must match the account&apos;s client ID. Holistics applies this condition to the dataset query, so rows for every other client are excluded before results are returned.</p>
        </section>
        <section className="rounded-md border border-cyan-200 bg-cyan-50 p-4">
          <h2 className="font-semibold text-[var(--color-primary-deep)]">Column-level permission</h2>
          <p className="mt-2 text-sm leading-6 text-blue-900">The signed <code className="rounded bg-cyan-100 px-1 py-0.5">pii_access</code> attribute controls Debtor State. Value <strong>1</strong> returns the state; value <strong>0</strong> replaces it with <code className="rounded bg-cyan-100 px-1 py-0.5">(redacted)</code> in the generated SQL.</p>
        </section>
      </div>
      <section className="border-b border-slate-200 p-6" aria-labelledby="permission-flow-heading">
        <h2 id="permission-flow-heading" className="text-xl font-semibold text-slate-950">How signed attributes become query results</h2>
        <p id="permission-flow-description" className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Compare the same server-controlled path for two identities. Both pass row scope; the column decision is where their results diverge.</p>

        <figure className="permission-diagram mt-5 overflow-hidden rounded-lg border border-slate-200 bg-slate-50" aria-labelledby="permission-flow-heading" aria-describedby="permission-flow-description">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
            <div>
              <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Server control</span>
              <strong className="mt-1 block text-sm text-slate-900">The server signs approved claims</strong>
            </div>
            <p className="max-w-sm text-xs leading-5 text-slate-500">The browser sends only <code className="font-mono text-slate-700">identity_id</code>; it cannot supply client or PII attributes.</p>
          </div>

          <div className="permission-diagram__lanes grid gap-px bg-slate-200">
            {identities.map((identity, index) => (
              <article key={identity.id} className="permission-trace min-w-0 bg-slate-50 p-5">
                <header className="min-h-24 border-b border-slate-200 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Trace {String(index + 1).padStart(2, "0")}</span>
                    <span className="rounded border border-slate-300 bg-white px-2 py-1 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-600">Approved</span>
                  </div>
                  <h3 className="mt-2 font-semibold leading-5 text-slate-950">{identity.name}</h3>
                  <p className="mt-1 break-words font-mono text-xs leading-5 text-slate-500">client [{identity.clientId}] · pii [{identity.piiAccess ? 1 : 0}]</p>
                </header>

                <ol className="permission-trace__steps mt-4 grid gap-5">
                  <li className="permission-step relative rounded-md border border-blue-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-blue-700">01 · Row scope</span>
                      <span className="font-mono text-[0.6875rem] font-semibold text-emerald-700"><span aria-hidden="true">✓</span> Pass</span>
                    </div>
                    <strong className="mt-2 block text-sm text-slate-950">Account client matches [{identity.clientId}]</strong>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Keep client {identity.clientId}; exclude every other client row.</p>
                  </li>
                  <li className={`permission-step relative rounded-md border bg-white p-4 ${identity.piiAccess ? "border-violet-200" : "border-orange-300"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${identity.piiAccess ? "text-violet-700" : "text-orange-700"}`}>02 · Column access</span>
                      <span className={`font-mono text-[0.6875rem] font-semibold ${identity.piiAccess ? "text-emerald-700" : "text-orange-700"}`}><span aria-hidden="true">{identity.piiAccess ? "✓" : "×"}</span> {identity.piiAccess ? "Pass" : "Fail"}</span>
                    </div>
                    {!identity.piiAccess && <span className="mt-2 inline-block rounded-sm bg-orange-100 px-2 py-1 font-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-orange-800">First divergence</span>}
                    <strong className="mt-2 block text-sm text-slate-950">pii_access = 1</strong>
                    <p className="mt-1 text-xs leading-5 text-slate-600">{identity.piiAccess ? "Return the real Debtor State value." : "Apply the masking expression in generated SQL."}</p>
                  </li>
                  <li className={`permission-step permission-step--result relative rounded-md border p-4 ${identity.piiAccess ? "border-emerald-200 bg-emerald-50" : "border-orange-300 bg-orange-50"}`}>
                    <span className={`font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.14em] ${identity.piiAccess ? "text-emerald-700" : "text-orange-700"}`}>Query result</span>
                    <strong className="mt-2 block text-sm text-slate-950">Client {identity.clientId} rows only</strong>
                    <p className="mt-1 text-xs leading-5 text-slate-700">Debtor State: <strong>{identity.piiAccess ? "CA, TX, …" : "(redacted)"}</strong></p>
                  </li>
                </ol>
              </article>
            ))}
          </div>

          <aside className="border-t border-slate-200 bg-[var(--color-primary-deep)] px-5 py-4 text-white">
            <p className="text-sm font-medium">Row access and column access compose independently.</p>
            <p className="mt-1 text-xs leading-5 text-blue-100">A failed PII check changes one field value—not the client rows already admitted by row scope.</p>
          </aside>
          <figcaption className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-500">
            <span><strong className="font-mono text-emerald-700">✓ PASS</strong> rule condition met</span>
            <span><strong className="font-mono text-orange-700">× FAIL</strong> masking fallback applied</span>
          </figcaption>
        </figure>
      </section>
      <div className="p-6">
        <h2 className="text-base font-semibold text-slate-800">RLS test identities</h2>
        <p className="mt-1 text-sm text-slate-500">Switch identities from the header, then compare the dashboard rows and Debtor State column.</p>
        <div className="mt-4 overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <caption className="sr-only">SCSI demo identities, signed access attributes, and expected dashboard results</caption>
            <thead className="bg-[var(--color-primary-deep)] text-white">
              <tr><th scope="col" className="px-4 py-3 font-semibold">Identity</th><th scope="col" className="px-4 py-3 font-semibold">Signed attributes</th><th scope="col" className="px-4 py-3 font-semibold">Expected rows</th><th scope="col" className="px-4 py-3 font-semibold">Debtor State</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {identities.map((identity) => (
                <tr key={identity.id}>
                  <th scope="row" className="px-4 py-4 font-medium text-slate-800">{identity.name}</th>
                  <td className="px-4 py-4 font-mono text-xs text-slate-600">scsi_client_id: [{identity.clientId}]<br />pii_access: [{identity.piiAccess ? 1 : 0}]</td>
                  <td className="px-4 py-4 text-slate-600">Client {identity.clientId} only</td>
                  <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${identity.piiAccess ? "bg-[var(--color-positive-fill)] text-[var(--color-positive-text)]" : "bg-[var(--color-warning-fill)] text-[var(--color-warning-text)]"}`}>{identity.piiAccess ? "Visible" : "(redacted)"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CustomEmbedPage({ url, loadedUrl, onUrlChange, onLoad, onCopy, onClear }) {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
      <form className="rounded-md border border-[var(--color-border)] bg-white p-5 shadow-[0_12px_36px_-24px_rgba(0,55,103,0.35)]" onSubmit={(event) => { event.preventDefault(); onLoad(); }}>
        <label htmlFor="custom-embed-url" className="block text-sm font-semibold text-[var(--color-text-strong)]">Custom embed URL</label>
        <p id="custom-embed-hint" className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">Paste a signed embed URL to compare it inside the SCSI portal shell.</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start">
          <textarea id="custom-embed-url" name="embed_url" value={url} onChange={(event) => onUrlChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && url.trim()) { event.preventDefault(); onLoad(); } }} aria-describedby="custom-embed-hint" placeholder="https://example.holistics.io/embed/..." rows={2} autoComplete="off" spellCheck="false" className="min-h-20 flex-1 resize-y break-all rounded-md border border-[var(--color-border-strong)] bg-[var(--color-canvas)] px-4 py-3 font-mono text-xs leading-5 text-[var(--color-text-strong)] shadow-inner outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-hover)]" />
          <div className="flex flex-wrap gap-2 lg:pt-1">
            <button type="submit" className="rounded-md bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(1,90,170,0.18)] transition-colors hover:bg-[var(--color-primary-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]">Load</button>
            <button type="button" onClick={onCopy} disabled={!loadedUrl} className="rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40">Copy URL</button>
            <button type="button" onClick={onClear} disabled={!url && !loadedUrl} className="rounded-md border border-[var(--color-border-strong)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-40">Clear</button>
          </div>
        </div>
      </form>
      <BrowserFrame address={loadedUrl || "No URL loaded"}>
        <div className="relative min-h-[28rem] flex-1 bg-[var(--color-canvas)]">
          {loadedUrl
            ? <iframe key={loadedUrl} src={loadedUrl} className="h-full w-full border-0" title="Custom Embedded Content" allow="clipboard-read; clipboard-write" />
            : <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--color-text-subtle)]">Paste an embed URL above and choose Load.</div>}
        </div>
      </BrowserFrame>
    </div>
  );
}
