'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  {
    href: '/dashboard/prehled',
    label: 'Přehled',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 13.5h6.5V20H4v-6.5zM13.5 4H20v16h-6.5V4zM4 4h6.5v6.5H4V4z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/jednotky',
    label: 'Jednotky',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 20.25V5.75A1.75 1.75 0 016.25 4h11.5a1.75 1.75 0 011.75 1.75v14.5M8 8h1.5M8 12h1.5M8 16h1.5M14.5 8H16m-1.5 4H16m-1.5 4H16M3 20.25h18" />
      </svg>
    ),
  },
  {
    href: '/dashboard/osoby',
    label: 'Osoby',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0" />
      </svg>
    ),
  },
  {
    href: '/dashboard/vyuctovani',
    label: 'Vyúčtování',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h7.128c.597 0 1.169.237 1.591.659l2.622 2.622c.422.422.659.994.659 1.591V20.25H7.5A3 3 0 014.5 17.25V6.75a3 3 0 013-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 3.75V8.25h4.5M8.25 12h7.5M8.25 15h7.5M8.25 18h4.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/cipy',
    label: 'Čipy',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.5l2.25-2.25a3.182 3.182 0 114.5 4.5l-2.25 2.25m-4.5-4.5l4.5 4.5m-4.5-4.5L4.5 17.25V21h3.75L18.75 10.5" />
      </svg>
    ),
  },
]

export default function TopNav({ email }: { email: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = email.slice(0, 2).toUpperCase()

  return (
    <nav className="h-16 bg-[linear-gradient(180deg,#141414_0%,#09090b_100%)] flex items-center px-3 sm:px-6 gap-3 sm:gap-6 flex-shrink-0 border-b border-white/10 shadow-[0_16px_38px_rgba(0,0,0,0.18)]">
      {/* Logo */}
      <Link href="/dashboard/prehled" className="flex items-center gap-3 mr-1 rounded-xl pr-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/70">
        <div className="relative w-9 h-9 rounded-xl bg-white text-zinc-950 flex items-center justify-center flex-shrink-0 shadow-[inset_0_-4px_0_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.18)]">
          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400 ring-4 ring-zinc-950" />
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <div className="leading-none hidden sm:block">
          <p className="text-white text-sm font-black tracking-tight">SVJ Správa</p>
          <p className="text-zinc-400 text-[10px] font-medium mt-1 hidden sm:block">Spojovací 557</p>
        </div>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] min-w-0 overflow-x-auto">
        {navLinks.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400/60 ${
                active
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <span className={active ? 'text-emerald-600' : 'text-zinc-500'}>{icon}</span>
              <span className="hidden sm:inline">{label}</span>
              {active && <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-emerald-400" />}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <span className="text-zinc-500 text-xs hidden lg:block max-w-56 truncate">{email}</span>
        <button
          onClick={handleLogout}
          className="text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors rounded-lg px-2 py-1.5 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Odhlásit
        </button>
        <div className="w-8 h-8 rounded-full bg-zinc-800 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-black">{initials}</span>
        </div>
      </div>
    </nav>
  )
}
