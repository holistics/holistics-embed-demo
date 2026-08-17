import React, { useState, useEffect, useCallback } from "react";

// --- Icons (Inline SVGs for zero dependencies) ---
const Icons = {
  Grid: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  Code: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  User: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Link: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  SignOut: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
};

const SESSION_KEY = "shelfoptix.session";
const ALL = "__ALL__";

// Scope reads the same way everywhere: as the list, or as the word "All".
const scopeText = (v) => (v === ALL ? "All" : Array.isArray(v) ? v.join(", ") : String(v ?? ""));

function CapabilityBadge({ capability, label }) {
  const explorer = capability === "explorer";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${explorer ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-700"}`}>
      {label || (explorer ? "Self-Serve (Explorer)" : "Standard/Traditional Dashboard View")}
    </span>
  );
}

// --- Login -----------------------------------------------------------
// A dropdown of emails. The password field is kept because the demo is
// partly about showing a host app authenticating a user, but the check is
// stubbed server-side -- anything signs in, empty included.
//
// The rest of the flow is unchanged and still worth showing: sign-in
// returns a signed session, and /api/embed-token derives the identity
// from that signature rather than from the request body.
function LoginScreen({ users, onSignIn, loading, error, submitting }) {
  // Derived, not synced: the field falls back to the first account until
  // someone picks one, so there is no effect writing state on mount.
  const [chosen, setChosen] = useState("");
  const [password, setPassword] = useState("");
  const email = chosen || users[0]?.email || "";
  const setEmail = setChosen;

  const selected = users.find((u) => u.email === email);
  // No password requirement: the check is stubbed for the local demo, so an
  // empty field signs in too.
  const canSubmit = Boolean(selected) && !submitting;

  const submit = (e) => {
    e.preventDefault();
    if (canSubmit) onSignIn(email, password);
  };

  return (
    <div className="min-h-screen w-full bg-[#070d18] flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <img src="https://storage.googleapis.com/shelfoptix_logos/apple-touch-icon.png" alt="ShelfOptix" className="w-10 h-10 rounded object-cover" />
          <span className="text-white font-semibold text-2xl tracking-wide" style={{ fontFamily: "Barlow, sans-serif" }}>ShelfOptix Analytics</span>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8">
          <h1 className="text-xl font-semibold text-slate-800">Sign in</h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">Choose an account to continue to RetailFocus.</p>

          <form onSubmit={submit}>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
          <select
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!users.length}
            className="w-full rounded-md border border-slate-300 shadow-sm focus:border-[#E63946] focus:ring focus:ring-[#E63946] focus:ring-opacity-50 text-sm py-2.5 px-3 bg-white cursor-pointer disabled:opacity-50"
          >
            {users.map((u) => (
              <option key={u.id} value={u.email}>{u.email}</option>
            ))}
          </select>

          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5 mt-4">
            Password <span className="font-normal text-slate-400">— optional, not checked</span>
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="anything — not checked"
            className="w-full rounded-md border border-slate-300 shadow-sm focus:border-[#E63946] focus:ring focus:ring-[#E63946] focus:ring-opacity-50 text-sm py-2.5 px-3 bg-white"
          />

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
          )}

          {/* What this account will actually see, before signing in. */}
          {selected && (
            <dl className="mt-5 space-y-2 text-sm bg-slate-50 border border-slate-200 rounded-md p-4">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Name</dt>
                <dd className="text-slate-800 font-medium text-right">{selected.name}<span className="text-slate-400 font-normal"> · {selected.org}</span></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">State</dt>
                <dd className="text-slate-800 text-right">{scopeText(selected.states)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500 shrink-0">Departments</dt>
                <dd className="text-slate-800 text-right">{scopeText(selected.depts)}</dd>
              </div>
              <div className="flex justify-between gap-4 items-center pt-1">
                <dt className="text-slate-500">Access</dt>
                <dd><CapabilityBadge capability={selected.capability} label={selected.capability_label} /></dd>
              </div>
            </dl>
          )}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="mt-6 w-full py-2.5 bg-[#E63946] text-white text-sm font-semibold rounded-md hover:bg-[#d62839] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Loading accounts…" : submitting ? "Signing in…" : "Sign in"}
          </button>
          </form>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Local demo. The password is not checked — pick an account and sign in. Whoever you pick becomes the embed identity, and the data is scoped to them.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);

  // The signed-in user plus the server-issued session token. Restored from
  // sessionStorage so a refresh does not bounce you back to the login screen.
  // The token is the credential from here on; the password is never kept.
  const [auth, setAuth] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed?.user && parsed?.session ? parsed : null;
    } catch {
      return null;
    }
  });
  const session = auth?.user || null;

  const [loginError, setLoginError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [activePage, setActivePage] = useState("embed"); // "embed" | "users" | "custom"
  const [customEmbedUrl, setCustomEmbedUrl] = useState("");
  const [customEmbedLoaded, setCustomEmbedLoaded] = useState("");

  const [embedUrl, setEmbedUrl] = useState(null);
  const [payload, setPayload] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, []);

  const signIn = useCallback(async (email, password) => {
    setSubmitting(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Sign-in failed (${res.status})`);

      const next = { user: data.user, session: data.session };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setAuth(next);
      setActivePage("embed");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, []);

  const signOut = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setAuth(null);
    setLoginError(null);
    // Drop the minted URL as well: leaving it around would keep the old
    // user's token alive in an iframe behind the login screen.
    setEmbedUrl(null);
    setPayload(null);
    setError(null);
  }, []);

  const fetchEmbedUrl = useCallback(async (token) => {
    setIsLoading(true);
    setError(null);
    try {
      // No user id in the body on purpose: the server reads the identity
      // out of the session token, so the browser cannot ask for another
      // account's data.
      const res = await fetch("/api/embed-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: "{}",
      });
      const data = await res.json();
      if (res.status === 401) {
        // Expired or rejected session: back to the login screen rather
        // than sitting on a page that will never load.
        signOut();
        setLoginError(data.error || "Your session has expired. Sign in again.");
        return;
      }
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setEmbedUrl(data.embedUrl);
      setPayload(data.payload || null);
    } catch (err) {
      setError(err.message);
      setEmbedUrl(null);
      setPayload(null);
    } finally {
      setIsLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    if (auth?.session && activePage === "embed") fetchEmbedUrl(auth.session);
  }, [auth, activePage, fetchEmbedUrl]);

  if (!session) {
    return (
      <LoginScreen
        users={users}
        onSignIn={signIn}
        loading={usersLoading}
        error={loginError}
        submitting={submitting}
      />
    );
  }

  const navItem = (page, label, icon) => (
    <button
      onClick={() => setActivePage(page)}
      title={isSidebarCollapsed ? label : undefined}
      className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-md transition-colors text-sm font-medium ${
        activePage === page ? "bg-[#E63946] text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
      }`}
    >
      {icon}
      {!isSidebarCollapsed && label}
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? "w-16" : "w-64"} bg-[#070d18] text-white flex flex-col shadow-xl z-20 transition-all duration-200`}>
        <div className={`p-4 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3 px-6"}`}>
          <img src="https://storage.googleapis.com/shelfoptix_logos/apple-touch-icon.png" alt="ShelfOptix" className="w-8 h-8 rounded object-cover shrink-0" />
          {!isSidebarCollapsed && <span className="font-semibold text-lg tracking-wide" style={{ fontFamily: "Barlow, sans-serif" }}>ShelfOptix Analytics</span>}
        </div>

        <nav className={`flex-1 ${isSidebarCollapsed ? "px-2" : "px-3"} space-y-1 mt-2 overflow-y-auto`}>
          {navItem("embed", "RetailFocus", <Icons.Grid className="w-5 h-5 shrink-0" />)}
          {navItem("users", "Users Reference", <Icons.User className="w-5 h-5 shrink-0" />)}
          {navItem("custom", "Custom Embed", <Icons.Link className="w-5 h-5 shrink-0" />)}
        </nav>

        {/* Signed-in identity, so it is never ambiguous who the embed is for. */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {!isSidebarCollapsed && (
            <div className="text-xs">
              <div className="text-white font-medium">{session.name}</div>
              <div className="text-slate-400 break-all">{session.email}</div>
            </div>
          )}
          <button
            onClick={signOut}
            title={isSidebarCollapsed ? "Sign out" : undefined}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center w-full" : "gap-2"} text-sm text-slate-300 hover:text-white transition-colors`}
          >
            <Icons.SignOut className="w-4 h-4" />
            {!isSidebarCollapsed && "Sign out"}
          </button>
          {!isSidebarCollapsed && (
            <button onClick={() => setIsDevMode(!isDevMode)} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Icons.Code className="w-4 h-4" />
              {isDevMode ? "Hide Dev Tools" : "Show Dev Tools"}
            </button>
          )}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex items-center ${isSidebarCollapsed ? "justify-center w-full" : "gap-2"} text-sm text-slate-300 hover:text-white transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isSidebarCollapsed ? "rotate-180" : ""}`}>
              <polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" />
            </svg>
            {!isSidebarCollapsed && "Collapse"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h1 className="text-xl font-semibold text-slate-800">
            {activePage === "users" ? "Users Reference" : activePage === "custom" ? "Custom Embed" : "RetailFocus"}
          </h1>
          <div className="flex items-center gap-4">
            {activePage === "embed" && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500">
                  {scopeText(session.states)} · {session.depts === ALL ? "All departments" : `${session.depts.length} departments`}
                </span>
                <CapabilityBadge capability={session.capability} label={session.capability_label} />
              </div>
            )}
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600" title={session.email}>
              <Icons.User className="w-4 h-4" />
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 p-6 overflow-auto bg-slate-50 relative">
            {activePage === "custom" ? (
              <div className="max-w-6xl mx-auto h-full flex flex-col gap-4">
                <div className="flex gap-2 items-start">
                  <textarea
                    value={customEmbedUrl}
                    onChange={(e) => setCustomEmbedUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), customEmbedUrl.trim() && setCustomEmbedLoaded(customEmbedUrl.trim()))}
                    placeholder="Paste any embed URL here..."
                    rows={2}
                    className="flex-1 rounded-md border border-slate-300 shadow-sm focus:border-[#E63946] focus:ring focus:ring-[#E63946] focus:ring-opacity-50 text-sm py-2 px-4 bg-white resize-none break-all"
                  />
                  <button onClick={() => customEmbedUrl.trim() && setCustomEmbedLoaded(customEmbedUrl.trim())} className="px-5 py-2 bg-[#E63946] text-white text-sm font-medium rounded-md hover:bg-[#d62839] transition-colors">Load</button>
                  <button onClick={() => { setCustomEmbedUrl(""); setCustomEmbedLoaded(""); }} disabled={!customEmbedUrl && !customEmbedLoaded} className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">Clear</button>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
                  <div className="flex-1 relative bg-slate-50">
                    {customEmbedLoaded ? (
                      <iframe key={customEmbedLoaded} src={customEmbedLoaded} className="w-full h-full border-0" title="Custom Embedded Content" allow="clipboard-read; clipboard-write" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">Paste an embed URL above and click Load</div>
                    )}
                  </div>
                </div>
              </div>
            ) : activePage === "users" ? (
              <div className="max-w-5xl mx-auto">
                <table className="w-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-sm">
                  <thead>
                    <tr className="bg-[#070d18] text-white text-left">
                      <th className="px-5 py-3 font-semibold">Name</th>
                      <th className="px-5 py-3 font-semibold">Credentials</th>
                      <th className="px-5 py-3 font-semibold">State</th>
                      <th className="px-5 py-3 font-semibold">Dept Description</th>
                      <th className="px-5 py-3 font-semibold">Agentic Capability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className={`hover:bg-slate-50 ${user.id === session.id ? "bg-amber-50" : ""}`}>
                        <td className="px-5 py-3 font-medium whitespace-nowrap">{user.name}</td>
                        <td className="px-5 py-3 font-mono text-xs">{user.email}</td>
                        <td className="px-5 py-3 whitespace-nowrap">{scopeText(user.states)}</td>
                        <td className="px-5 py-3 text-xs">{scopeText(user.depts)}</td>
                        <td className="px-5 py-3"><CapabilityBadge capability={user.capability} label={user.capability_label} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-slate-400 mt-3">
                  State and Dept Description ride in the token as the <span className="font-mono">store_state</span> and <span className="font-mono">dept</span> user attributes, and are enforced by row-level permission on the dataset. <span className="font-mono">All</span> is sent as <span className="font-mono">__ALL__</span>, which bypasses that one rule. Agentic Capability picks the portal: Explorer users get the dataset alongside the dashboard, so they can build their own analysis.
                </p>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto h-full flex flex-col">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
                  <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="mx-auto bg-white border border-slate-200 text-slate-400 text-xs py-1 px-4 flex-1 max-w-md text-center rounded overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                      {embedUrl || "Loading..."}
                    </div>
                  </div>
                  <div className="flex-1 relative bg-slate-50">
                    {isLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                        <div className="w-8 h-8 border-4 border-[#E63946] border-t-transparent rounded-full animate-spin"></div>
                        <span className="mt-4 text-sm font-medium text-slate-600">Loading Holistics Data...</span>
                      </div>
                    )}
                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center text-red-600 text-sm px-10 text-center">
                        {error}
                      </div>
                    )}
                    {embedUrl && (
                      <iframe key={embedUrl} src={embedUrl} className="w-full h-full border-0" title="Holistics Embedded Dashboard" allow="clipboard-read; clipboard-write" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Payload Panel — the token the server actually signed. */}
          {isDevMode && (
            <aside className="w-[420px] bg-[#0a192f] text-slate-300 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#051024]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Icons.Code className="w-4 h-4 text-[#E63946]" />
                  JWT Payload
                </h3>
                <button onClick={() => setIsDevMode(false)} className="text-slate-500 hover:text-white">×</button>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                <div className="bg-[#051024] p-4 rounded border border-slate-800 overflow-x-auto">
                  <pre className="text-slate-300">{payload ? JSON.stringify(payload, null, 2) : "Sign in and open the RetailFocus tab to mint a token."}</pre>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
