import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TopNav from '@/components/TopNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav email={user.email ?? ''} />
      <main className="flex-1 overflow-hidden bg-dot-pattern">
        {children}
      </main>
    </div>
  )
}
