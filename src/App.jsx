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
};

// --- Portals ---
const PORTALS = [
  { id: "ecommerce_portal", title: "Ecommerce Dashboard", icon: "ShoppingCart" },
];

const USERS = [
  { id: "user_1", name: "Alice Johnson", email: "alice.johnson@acmecorp.com" },
  { id: "user_2", name: "Bob Smith", email: "bob.smith@betaretail.com" },
  { id: "chinh.dm", name: "Chinh DM", email: "chinh.dm@holistics.io" },
];

export default function App() {
  const [activePortal, setActivePortal] = useState(PORTALS[0]);
  const [activeUser, setActiveUser] = useState(USERS[0]);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDevMode, setIsDevMode] = useState(false);

  const fetchEmbedUrl = useCallback(async (portalId, user) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("http://localhost:3001/api/embed-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal: portalId, user }),
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
    fetchEmbedUrl(activePortal.id, activeUser);
  }, [activePortal, activeUser, fetchEmbedUrl]);

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-[#05264C] text-white flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#259B6C] flex items-center justify-center font-bold text-xl">H</div>
          <span className="font-semibold text-lg tracking-wide">Embed Portal</span>
        </div>

        <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Dashboards</div>

        <nav className="flex-1 px-3 space-y-1 mt-2">
          {PORTALS.map((portal) => {
            const Icon = Icons[portal.icon];
            const isActive = activePortal.id === portal.id;
            return (
              <button
                key={portal.id}
                onClick={() => setActivePortal(portal)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium ${
                  isActive ? "bg-[#259B6C] text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                {portal.title}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={() => setIsDevMode(!isDevMode)} className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
            <Icons.Code className="w-4 h-4" />
            {isDevMode ? "Hide Dev Tools" : "Show Dev Tools"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h1 className="text-xl font-semibold text-slate-800">{activePortal.title}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Viewing as:</span>
              <select
                value={activeUser.id}
                onChange={(e) => setActiveUser(USERS.find((u) => u.id === e.target.value))}
                className="block w-56 rounded-md border-slate-300 shadow-sm focus:border-[#259B6C] focus:ring focus:ring-[#259B6C] focus:ring-opacity-50 text-sm py-1.5 pl-3 pr-8 bg-slate-50 cursor-pointer"
              >
                {USERS.map((user) => (
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
          {/* Embed Area */}
          <main className="flex-1 p-6 overflow-auto bg-slate-50 relative">
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
          </main>

          {/* Dev Tools Panel */}
          {isDevMode && (
            <aside className="w-96 bg-[#0a192f] text-slate-300 border-l border-slate-800 flex flex-col z-20 shadow-2xl">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#051024]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Icons.Code className="w-4 h-4 text-[#259B6C]" />
                  Embed Debugger
                </h3>
                <button onClick={() => setIsDevMode(false)} className="text-slate-500 hover:text-white">×</button>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-6 font-mono text-xs">
                <div>
                  <h4 className="text-[#259B6C] font-semibold mb-2 uppercase tracking-wider">Active Portal</h4>
                  <div className="bg-[#051024] p-3 rounded border border-slate-800 overflow-x-auto">
                    <pre className="text-green-400">{JSON.stringify({ object_name: activePortal.id, object_type: "EmbedPortal" }, null, 2)}</pre>
                  </div>
                </div>
                <div>
                  <h4 className="text-[#259B6C] font-semibold mb-2 uppercase tracking-wider">Embed URL</h4>
                  <div className="bg-[#051024] p-3 rounded border border-slate-800 overflow-x-auto">
                    <pre className="text-blue-300 break-all whitespace-pre-wrap">{embedUrl || "Fetching..."}</pre>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
