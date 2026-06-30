import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Premium Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-surface border-r border-surface-border lg:min-h-screen flex flex-col z-50">
        <div className="h-20 flex items-center px-8 border-b border-surface-border">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-md border border-secondary/30 p-1 overflow-hidden">
              <img src="/logo.png" alt="AJ Solutions" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">FinApp</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-2">
          <Link href="/dashboard" className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-surface-border text-white font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            <span>Visão Geral</span>
          </Link>
          <a href="#" onClick={(e) => { e.preventDefault(); alert('A tela de Transações será lançada na próxima versão!'); }} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary hover:bg-surface-border hover:text-foreground font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
            <span>Transações</span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); alert('A tela de Metas será lançada na próxima versão!'); }} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary hover:bg-surface-border hover:text-foreground font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span>Metas e Limites</span>
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); alert('A tela de Contas Bancárias será lançada na próxima versão!'); }} className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary hover:bg-surface-border hover:text-foreground font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
            <span>Contas Bancárias</span>
          </a>
          <Link href="/dashboard/family" className="flex items-center space-x-3 px-4 py-3 rounded-xl text-secondary hover:bg-surface-border hover:text-foreground font-medium transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            <span>Família</span>
          </Link>
        </nav>

        <div className="p-6 border-t border-surface-border">
          <div className="flex items-center space-x-3 p-3 rounded-xl bg-background border border-surface-border">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
              J
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-foreground truncate">Junio & Esposa</p>
              <p className="text-xs text-secondary truncate">Workspace Premium</p>
            </div>
            <button className="text-secondary hover:text-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  )
}
