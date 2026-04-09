import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NavItem from '@/components/NavItem'
import LogoutButton from '@/components/LogoutButton'

const navigace = [
  {
    href: '/dashboard',
    label: 'Přehled',
    exact: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/jednotky',
    label: 'Jednotky',
    exact: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    href: '/dashboard/osoby',
    label: 'Osoby',
    exact: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'SV'

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-zinc-950 flex flex-col border-r border-white/5">

        {/* Logo */}
        <div className="px-4 pt-6 pb-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-none">SVJ Správa</p>
              <p className="text-zinc-500 text-xs mt-0.5">Spojovací 557</p>
            </div>
          </div>
        </div>

        {/* Oddělovač */}
        <div className="mx-4 h-px bg-white/5 mb-4" />

        {/* Navigace */}
        <nav className="flex-1 px-3 space-y-0.5">
          <p className="px-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">Správa</p>
          {navigace.map(item => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>

        {/* Uživatel */}
        <div className="px-3 pb-4 pt-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold">{initials}</span>
            </div>
            <p className="text-xs text-zinc-400 truncate">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Hlavní obsah */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
