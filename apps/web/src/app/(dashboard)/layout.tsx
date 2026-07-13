'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getToken, clearToken, parseToken, type TokenPayload } from '@/lib/auth'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from 'sonner'
import {
  Receipt,
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Tag,
  Shield,
  CreditCard,
  LogOut,
  Building2,
  Menu,
  X,
  ClipboardCheck,
  Settings,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'All Expenses', href: '/admin/expenses', icon: CreditCard, roles: ['ADMIN'] },
  { label: 'Unit Expenses', href: '/finance/expenses', icon: CreditCard, roles: ['FINANCE'] },
  { label: 'My Expenses', href: '/expenses', icon: FileText, roles: ['EMPLOYEE', 'FINANCE'] },
  { label: 'Approve Requests', href: '/approve-requests', icon: ClipboardCheck, roles: ['EMPLOYEE', 'FINANCE'] },
  { label: 'Employees', href: '/employees', icon: Users, roles: ['ADMIN'] },
  { label: 'Positions', href: '/positions', icon: Briefcase, roles: ['ADMIN'] },
  { label: 'Categories', href: '/categories', icon: Tag, roles: ['ADMIN', 'FINANCE'] },
  { label: 'Spending Policies', href: '/policies', icon: Shield, roles: ['ADMIN', 'FINANCE'] },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<TokenPayload | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fromParam = searchParams.get('from')
  const isExpenseDetail = /^\/expenses\/.+/.test(pathname)

  function getActive(item: NavItem, role: string | undefined): boolean {
    if (isExpenseDetail) {
      if (fromParam === 'approve-requests') return item.href === '/approve-requests'
      if (role === 'ADMIN')   return item.href === '/admin/expenses'
      if (role === 'FINANCE') return item.href === '/finance/expenses'
      return item.href === '/expenses'
    }
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.replace('/login')
      return
    }
    const payload = parseToken(token)
    if (!payload) {
      clearToken()
      router.replace('/login')
      return
    }
    setUser(payload)
  }, [router])

  function handleLogout() {
    clearToken()
    router.replace('/login')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const visibleNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(user.role ?? '')
  )

  const Sidebar = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center shrink-0">
          <Receipt className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="font-bold tracking-tight text-foreground">Imbursare</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {!user.companyId && (
          <Link
            href="/company/create"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              pathname === '/company/create'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Building2 className="h-4 w-4 shrink-0" />
            Create Company
          </Link>
        )}
        {visibleNav.map((item) => {
          const Icon = item.icon
          const active = getActive(item, user?.role)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-2">
          <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground">
            {user.role ?? 'No company'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-60 bg-card border-r border-border z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4 shrink-0">
          <button
            className="md:hidden rounded-lg p-1.5 hover:bg-accent transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex-1 md:flex-none" />
          <ThemeToggle />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  )
}
