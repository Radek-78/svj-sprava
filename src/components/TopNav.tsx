'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navLinks = [
  { href: '/dashboard/prehled', label: 'Přehled' },
  { href: '/dashboard/jednotky', label: 'Jednotky' },
  { href: '/dashboard/osoby', label: 'Osoby' },
  { href: '/dashboard/cipy', label: 'Čipy' },
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
    <nav className="h-14 bg-zinc-950 flex items-center px-6 gap-6 flex-shrink-0 border-b border-zinc-800">
      {/* Logo */}
      <Link href="/dashboard/prehled" className="flex items-center gap-2.5 mr-2">
        <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        </div>
        <div className="leading-none">
          <p className="text-white text-sm font-semibold">SVJ Správa</p>
          <p className="text-zinc-500 text-[10px]">Spojovací 557</p>
        </div>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1">
        {navLinks.map(({ href, label }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/10 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-zinc-500 text-xs hidden sm:block">{email}</span>
        <button
          onClick={handleLogout}
          className="text-zinc-400 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Odhlásit
        </button>
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[10px] font-bold">{initials}</span>
        </div>
      </div>
    </nav>
  )
}
