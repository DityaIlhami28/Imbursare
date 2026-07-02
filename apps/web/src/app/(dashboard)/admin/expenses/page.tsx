'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type ExpenseSummary, type ExpenseStatus } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { CreditCard, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

const STATUS_FILTERS = ['ALL', 'SUBMIT', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const
type Filter = (typeof STATUS_FILTERS)[number]

const FILTER_CONFIG: Record<Filter, { label: string; activeBg: string; activeText: string; activeBorder: string }> = {
  ALL:        { label: 'All',        activeBg: 'bg-primary/10 dark:bg-primary/20',        activeText: 'text-primary',                           activeBorder: 'border-primary/40' },
  SUBMIT:     { label: 'Submitted',  activeBg: 'bg-blue-100 dark:bg-blue-900/30',         activeText: 'text-blue-700 dark:text-blue-400',       activeBorder: 'border-blue-300 dark:border-blue-700' },
  APPROVED:   { label: 'Approved',   activeBg: 'bg-green-100 dark:bg-green-900/30',       activeText: 'text-green-700 dark:text-green-400',     activeBorder: 'border-green-300 dark:border-green-700' },
  REJECTED:   { label: 'Rejected',   activeBg: 'bg-red-100 dark:bg-red-900/30',           activeText: 'text-red-700 dark:text-red-400',         activeBorder: 'border-red-300 dark:border-red-700' },
  REIMBURSED: { label: 'Reimbursed', activeBg: 'bg-purple-100 dark:bg-purple-900/30',     activeText: 'text-purple-700 dark:text-purple-400',   activeBorder: 'border-purple-300 dark:border-purple-700' },
}

type AdminExpense = ExpenseSummary & { userId: string; companyId: string }

export default function AdminExpensesPage() {
  const [expenses, setExpenses] = useState<AdminExpense[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.expense.getAdminExpenses(token)
      .then(setExpenses)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const searched = expenses.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.title.toLowerCase().includes(q) ||
      (e.expenseNumber ?? '').toLowerCase().includes(q)
    )
  })
  const filtered = filter === 'ALL' ? searched : searched.filter((e) => e.status === (filter as ExpenseStatus))
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">All Company Expenses</h1>
        <p className="text-sm text-muted-foreground">Review and track all expense submissions across your company</p>
      </div>

      {/* Filter cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {STATUS_FILTERS.map((f) => {
          const cfg = FILTER_CONFIG[f]
          const count = f === 'ALL'
            ? searched.length
            : searched.filter((e) => e.status === (f as ExpenseStatus)).length
          const active = filter === f
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1) }}
              className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${
                active
                  ? `${cfg.activeBg} ${cfg.activeBorder} ring-1 ring-inset ${cfg.activeBorder}`
                  : 'border-border bg-card hover:bg-accent/40'
              }`}
            >
              <p className={`text-2xl font-bold leading-none ${active ? cfg.activeText : 'text-foreground'}`}>
                {loading ? '–' : count}
              </p>
              <p className={`text-xs font-medium mt-1.5 ${active ? cfg.activeText : 'text-muted-foreground'}`}>
                {cfg.label}
              </p>
            </button>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {filter === 'ALL'
                ? `All Expenses (${searched.length})`
                : `${FILTER_CONFIG[filter].label} (${filtered.length})`}
            </CardTitle>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search title or number…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring transition-shadow"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">
                {search ? 'No expenses match your search.' : 'No expenses found'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {search ? 'Try a different keyword.' : 'Try selecting a different filter above.'}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paginated.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/expenses/${expense.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 first:pt-0 last:pb-0 hover:bg-accent/50 rounded-lg transition-colors"
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
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <StatusBadge status={expense.status} />
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {expense.amount.toLocaleString('id-ID', {
                          style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <Pagination
                total={filtered.length}
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
