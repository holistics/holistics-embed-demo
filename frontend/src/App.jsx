import React, { useState, useEffect, useCallback } from "react";

// --- Icons (Inline SVGs for zero dependencies) ---
const Icons = {
  ShoppingCart: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  ),
  Activity: (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
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
};

export default function App() {
  const [portals, setPortals] = useState([]);
  const [users, setUsers] = useState([]);
  const [activePage, setActivePage] = useState("portal"); // "portal" | "users" | "custom"
  const [customEmbedUrl, setCustomEmbedUrl] = useState("");
  const [customEmbedLoaded, setCustomEmbedLoaded] = useState("");
  const [activePortal, setActivePortal] = useState(null);
  const [activeUser, setActiveUser] = useState(null);

  const [embedUrl, setEmbedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        setPortals(data.portals);
        setUsers(data.users);
        setActivePortal(data.portals[0]);
        setActiveUser(data.users[0]);
      });
  }, []);

  const fetchEmbedUrl = useCallback(async (portal, user) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/embed-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: portal.portal || portal.id, user, data_source: user.dataSource, url_suffix: portal.urlSuffix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmbedUrl(data.embedUrl);
    } catch (err) {
      setError(err.message);
      setEmbedUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activePortal && activeUser) fetchEmbedUrl(activePortal, activeUser);
  }, [activePortal, activeUser, fetchEmbedUrl]);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className={`${isSidebarCollapsed ? "w-16" : "w-64"} bg-[#05264C] text-white flex flex-col shadow-xl z-20 transition-all duration-200`}>
        <div className={`p-4 flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3 px-6"}`}>
          <div className="w-8 h-8 rounded bg-[#259B6C] flex items-center justify-center font-bold text-xl shrink-0">H</div>
          {!isSidebarCollapsed && <span className="font-semibold text-lg tracking-wide">Embed Portal</span>}
        </div>

        {!isSidebarCollapsed && <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dashboards</div>}

        <nav className={`flex-1 ${isSidebarCollapsed ? "px-2" : "px-3"} space-y-1 mt-2`}>
          {portals.map((portal) => {
            const Icon = Icons[portal.icon];
            const isActive = activePage === "portal" && activePortal?.id === portal.id;
            return (
              <button
                key={portal.id}
                onClick={() => { setActivePage("portal"); setActivePortal(portal); }}
                title={isSidebarCollapsed ? portal.title : undefined}
                className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-md transition-colors text-sm font-medium ${
                  isActive ? "bg-[#259B6C] text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isSidebarCollapsed && portal.title}
              </button>
            );
          })}
          <button
            onClick={() => setActivePage("users")}
            title={isSidebarCollapsed ? "Users Reference" : undefined}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-md transition-colors text-sm font-medium ${
              activePage === "users" ? "bg-[#259B6C] text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icons.User className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && "Users Reference"}
          </button>
          <button
            onClick={() => setActivePage("custom")}
            title={isSidebarCollapsed ? "Custom Embed" : undefined}
            className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center px-2" : "gap-3 px-3"} py-2.5 rounded-md transition-colors text-sm font-medium ${
              activePage === "custom" ? "bg-[#259B6C] text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icons.Link className="w-5 h-5 shrink-0" />
            {!isSidebarCollapsed && "Custom Embed"}
          </button>
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-2">
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
          <h1 className="text-xl font-semibold text-slate-800">{activePage === "users" ? "Users Reference" : activePage === "custom" ? "Custom Embed" : activePortal?.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Viewing as:</span>
              <select
                value={activeUser?.id || ""}
                onChange={(e) => setActiveUser(users.find((u) => u.id === e.target.value))}
                className="block w-56 rounded-md border-slate-300 shadow-sm focus:border-[#259B6C] focus:ring focus:ring-[#259B6C] focus:ring-opacity-50 text-sm py-1.5 pl-3 pr-8 bg-slate-50 cursor-pointer"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                ))}
              </select>
            </div>
            <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
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
                    className="flex-1 rounded-md border border-slate-300 shadow-sm focus:border-[#259B6C] focus:ring focus:ring-[#259B6C] focus:ring-opacity-50 text-sm py-2 px-4 bg-white resize-none break-all"
                  />
                  <button
                    onClick={() => customEmbedUrl.trim() && setCustomEmbedLoaded(customEmbedUrl.trim())}
                    className="px-5 py-2 bg-[#259B6C] text-white text-sm font-medium rounded-md hover:bg-[#1e7d57] transition-colors"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => { if (customEmbedLoaded) { navigator.clipboard.writeText(customEmbedLoaded); } }}
                    disabled={!customEmbedLoaded}
                    className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => { setCustomEmbedUrl(""); setCustomEmbedLoaded(""); }}
                    disabled={!customEmbedUrl && !customEmbedLoaded}
                    className="px-4 py-2 bg-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
                  <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="mx-auto bg-white border border-slate-200 text-slate-400 text-xs py-1 px-4 flex-1 max-w-md text-center rounded overflow-hidden text-ellipsis whitespace-nowrap font-mono">
                      {customEmbedLoaded || "No URL loaded"}
                    </div>
                  </div>
                  <div className="flex-1 relative bg-slate-50">
                    {customEmbedLoaded ? (
                      <iframe
                        key={customEmbedLoaded}
                        src={customEmbedLoaded}
                        className="w-full h-full border-0"
                        title="Custom Embedded Content"
                        allow="clipboard-read; clipboard-write"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                        Paste an embed URL above and click Load
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : activePage === "users" ? (
              <div className="max-w-4xl mx-auto">
                <table className="w-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden text-sm">
                  <thead>
                    <tr className="bg-[#05264C] text-white text-left">
                      <th className="px-6 py-3 font-semibold">Name</th>
                      <th className="px-6 py-3 font-semibold">User ID</th>
                      <th className="px-6 py-3 font-semibold">Email</th>
                      <th className="px-6 py-3 font-semibold">Data Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3">{user.name}</td>
                        <td className="px-6 py-3 font-mono text-xs">{user.id}</td>
                        <td className="px-6 py-3">{user.email}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            user.dataSource === "customer_acme" ? "bg-blue-100 text-blue-700" :
                            user.dataSource === "customer_globex" ? "bg-emerald-100 text-emerald-700" :
                            "bg-purple-100 text-purple-700"
                          }`}>{user.dataSource}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto h-full flex flex-col">
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-hidden relative flex flex-col">
                  {/* Browser chrome */}
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

                  {/* Iframe content */}
                  <div className="flex-1 relative bg-slate-50">
                    {isLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                        <div className="w-8 h-8 border-4 border-[#259B6C] border-t-transparent rounded-full animate-spin"></div>
                        <span className="mt-4 text-sm font-medium text-slate-600">Loading Holistics Data...</span>
                      </div>
                    )}
                    {error && (
                      <div className="absolute inset-0 flex items-center justify-center text-red-500 text-sm">
                        Error: {error}. Make sure the backend server is running on port 3001.
                      </div>
                    )}
                    {embedUrl && (
                      <iframe
                        key={embedUrl}
                        src={embedUrl}
                        className="w-full h-full border-0"
                        title="Holistics Embedded Dashboard"
                        allow="clipboard-read; clipboard-write"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Payload Panel */}
          {isDevMode && (
            <aside className="w-[420px] bg-[#0a192f] text-slate-300 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#051024]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Icons.Code className="w-4 h-4 text-[#259B6C]" />
                  JWT Payload
                </h3>
                <button onClick={() => setIsDevMode(false)} className="text-slate-500 hover:text-white">×</button>
              </div>
              <div className="flex-1 overflow-auto p-4 font-mono text-xs">
                <div className="bg-[#051024] p-4 rounded border border-slate-800 overflow-x-auto">
                  <pre className="text-slate-300">{JSON.stringify({
                    object_name: activePortal?.portal || activePortal?.id,
                    object_type: "EmbedPortal",
                    embed_user_id: activeUser?.id,
                    embed_user_email: activeUser?.email,
                    settings: {
                      ai: { enabled: true },
                      allow_dashboard_export: true,
                      allow_raw_data_export: true,
                      allow_data_subscribe: true,
                    },
                    user_attributes: {
                      vendor_id: "__ALL__",
                      country: "__ALL__",
                      city: "__ALL__",
                      ...(activeUser?.dataSource && { data_source: [activeUser.dataSource] }),
                    },
                    permissions: {},
                    exp: "Math.floor(Date.now() / 1000) + 3600",
                  }, null, 2)}</pre>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
