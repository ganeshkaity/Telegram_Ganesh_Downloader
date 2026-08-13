export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#090d16] text-slate-100 relative overflow-hidden flex flex-col justify-between p-6 md:p-12">
      {/* Background Ambient Glows */}
      <div className="glow-effect top-[-100px] left-[-100px]" />
      <div className="glow-effect bottom-[-100px] right-[-100px] !bg-[radial-gradient(circle,rgba(236,72,153,0.12)_0%,rgba(99,102,241,0.05)_50%,rgba(0,0,0,0)_70%)]" />

      <div className="max-w-6xl mx-auto w-full space-y-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">
              🎬
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-pink-400">
                Telegram Media Downloader
              </h1>
              <p className="text-xs text-slate-400">Next.js + TypeScript + yt-dlp Direct CDN Architecture</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-slate-900/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Zero Server Proxy Active</span>
          </div>
        </header>

        {/* Hero Section */}
        <section className="space-y-4 text-center md:text-left">
          <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-semibold">
            <span>⚡ Direct Download Engine</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight">
            High-Speed Media Extraction with <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-500">Zero Server File Storage</span>
          </h2>
          <p className="text-slate-400 max-w-2xl text-sm md:text-base leading-relaxed">
            The server extracts direct media CDN URLs using <code className="bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">yt-dlp</code> and issues secure, temporary tokenized redirects. Media files stream directly from source CDNs to the user&apos;s browser.
          </p>
        </section>

        {/* Architecture Flow Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur relative overflow-hidden group hover:border-slate-700 transition">
            <div className="text-2xl mb-2">1️⃣</div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">Telegram Callback</h3>
            <p className="text-xs text-slate-400">User triggers interactive inline keyboard menu or sends media link.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur relative overflow-hidden group hover:border-slate-700 transition">
            <div className="text-2xl mb-2">2️⃣</div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">yt-dlp Resolution</h3>
            <p className="text-xs text-slate-400">Subprocess parses format options, resolutions, and direct CDN streams.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur relative overflow-hidden group hover:border-slate-700 transition">
            <div className="text-2xl mb-2">3️⃣</div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">Token Generation</h3>
            <p className="text-xs text-slate-400">Crypto token created & stored in SQLite mapping to direct media URL.</p>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 p-5 rounded-2xl backdrop-blur relative overflow-hidden group hover:border-slate-700 transition">
            <div className="text-2xl mb-2">4️⃣</div>
            <h3 className="font-semibold text-slate-200 text-sm mb-1">HTTP 302 Redirect</h3>
            <p className="text-xs text-slate-400">Browser opens token link and is instantly redirected to CDN media URL.</p>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Supported Modules */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
              <span>🎬</span>
              <span>Supported Media Modules</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/50">
                <span className="font-medium">▶️ YouTube Downloader</span>
                <span className="text-slate-400">Video (144p–1080p, Best), Audio, Thumbnail</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/50">
                <span className="font-medium">📸 Instagram Downloader</span>
                <span className="text-slate-400">Reels, Posts & Audio</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/50">
                <span className="font-medium">📑 YouTube Playlist</span>
                <span className="text-slate-400">Flat extraction & paginated items</span>
              </li>
              <li className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800/50">
                <span className="font-medium">🌐 Any Website Media</span>
                <span className="text-slate-400">Universal yt-dlp metadata detection</span>
              </li>
            </ul>
          </div>

          {/* Quick Start Commands */}
          <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
              <span>🚀</span>
              <span>Developer Execution Guide</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">1. Run local bot via Long-Polling mode:</span>
                <div className="bg-black/60 border border-slate-800 p-2.5 rounded-lg font-mono text-emerald-400">
                  npm run bot:poll
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">2. Run Next.js server & Webhook API:</span>
                <div className="bg-black/60 border border-slate-800 p-2.5 rounded-lg font-mono text-blue-400">
                  npm run dev
                </div>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">3. Containerized Docker Deployment:</span>
                <div className="bg-black/60 border border-slate-800 p-2.5 rounded-lg font-mono text-purple-400">
                  docker-compose up -d --build
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full pt-12 text-center text-xs text-slate-500 border-t border-slate-800/60 mt-12">
        Telegram Media Downloader • Next.js + TypeScript + yt-dlp + SQLite • Server File-Storage Free Architecture
      </footer>
    </main>
  );
}
