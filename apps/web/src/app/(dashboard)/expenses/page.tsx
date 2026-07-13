'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type ExpenseSummary } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Plus, Receipt, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

const STATUS_FILTERS = ['ALL', 'DRAFT', 'SUBMIT', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const
type Filter = (typeof STATUS_FILTERS)[number]

const FILTER_CONFIG: Record<Filter, { label: string; activeBg: string; activeText: string; activeBorder: string }> = {
  ALL:        { label: 'All',        activeBg: 'bg-primary/10 dark:bg-primary/20',        activeText: 'text-primary',                          activeBorder: 'border-primary/40' },
  DRAFT:      { label: 'Draft',      activeBg: 'bg-muted',                                activeText: 'text-muted-foreground',                  activeBorder: 'border-border' },
  SUBMIT:     { label: 'Submitted',  activeBg: 'bg-blue-100 dark:bg-blue-900/30',         activeText: 'text-blue-700 dark:text-blue-400',       activeBorder: 'border-blue-300 dark:border-blue-700' },
  APPROVED:   { label: 'Approved',   activeBg: 'bg-green-100 dark:bg-green-900/30',       activeText: 'text-green-700 dark:text-green-400',     activeBorder: 'border-green-300 dark:border-green-700' },
  REJECTED:   { label: 'Rejected',   activeBg: 'bg-red-100 dark:bg-red-900/30',           activeText: 'text-red-700 dark:text-red-400',         activeBorder: 'border-red-300 dark:border-red-700' },
  REIMBURSED: { label: 'Reimbursed', activeBg: 'bg-purple-100 dark:bg-purple-900/30',     activeText: 'text-purple-700 dark:text-purple-400',   activeBorder: 'border-purple-300 dark:border-purple-700' },
}

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseSummary[]>([])
  const [total, setTotal] = useState(0)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Debounce search input; settling on a new term resets to the first page.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    api.expense.getMyExpenses(token, { page, pageSize, search: debouncedSearch, status: filter })
      .then((res) => { setData(res.data); setTotal(res.total); setStatusCounts(res.statusCounts) })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [page, pageSize, filter, debouncedSearch])

  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Expenses</h1>
          <p className="text-sm text-muted-foreground">Track and manage your expense submissions</p>
        </div>
        <Button render={<Link href="/expenses/new" />}>
          <Plus className="h-4 w-4 mr-1.5" /> New Expense
        </Button>
      </div>

      {/* Status filter cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {STATUS_FILTERS.map((s) => {
          const cfg = FILTER_CONFIG[s]
          const count = s === 'ALL' ? allCount : statusCounts[s] ?? 0
          const active = filter === s
          return (
            <button
              key={s}
              onClick={() => { setFilter(s); setPage(1) }}
              className={`rounded-xl border p-3 text-left transition-all ${
                active
                  ? `${cfg.activeBg} ${cfg.activeBorder} ring-1 ring-inset ${cfg.activeBorder}`
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              <p className={`text-2xl font-bold leading-none ${active ? cfg.activeText : 'text-foreground'}`}>
                {loading ? '–' : count}
              </p>
              <p className={`text-xs font-medium mt-1.5 ${active ? cfg.activeText : 'text-muted-foreground'}`}>{cfg.label}</p>
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">
              {filter === 'ALL' ? `All Expenses (${allCount})` : `${FILTER_CONFIG[filter].label} (${total})`}
            </CardTitle>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search title or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : data.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {debouncedSearch ? 'No expenses match your search.' : 'No expenses found.'}
              </p>
              {!debouncedSearch && (
                <Link href="/expenses/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                  Submit your first expense
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden sm:flex items-center px-2 pb-2 mb-1 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="flex-1 min-w-0">Expense</span>
                <div className="flex items-center ml-4 shrink-0">
                  <span className="w-28 shrink-0">Status</span>
                  <span className="w-32 shrink-0 text-right">Amount</span>
                </div>
              </div>
              <div className="divide-y divide-border">
                {data.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center py-3 first:pt-0 last:pb-0 hover:bg-accent/50 rounded-lg px-2 -mx-2 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.expenseNumber && <span className="font-mono mr-1.5">{expense.expenseNumber}</span>}
                        {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center ml-4 shrink-0">
                      <div className="w-28 shrink-0"><StatusBadge status={expense.status} /></div>
                      <span className="w-32 shrink-0 text-right text-sm font-semibold text-foreground">
                        {expense.amount.toLocaleString('id-ID', {
                          style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination
                total={total}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(s) => { setPageSize(s); setPage(1) }}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
