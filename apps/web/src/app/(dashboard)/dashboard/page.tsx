'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { getToken, parseToken } from '@/lib/auth'
import { api, type ExpenseSummary } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import {
  Receipt, FileText, CheckCircle, Clock, Building2, Plus, ArrowRight,
  CreditCard, TrendingUp, Building,
} from 'lucide-react'

type AdminExpense = ExpenseSummary & { userId: string; companyId: string; unit: string | null }

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  SUBMIT: '#3b82f6',
  APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  REIMBURSED: '#a855f7',
}

function getLast6Months() {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (5 - i))
    return d
  })
}

function isSameMonth(dateStr: string, ref: Date) {
  const d = new Date(dateStr)
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear()
}

function formatCompact(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}jt`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}rb`
  return v.toString()
}

function formatIDR(v: number) {
  return v.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
}

function StatCard({
  label, value, sub, icon: Icon,
}: {
  label: string; value: string | number; sub?: string; icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <Icon className="h-4 w-4" /> {label}
        </CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardHeader>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm space-y-1">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? formatIDR(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard({ expenses }: { expenses: AdminExpense[] }) {
  const [unitFilter, setUnitFilter] = useState<string>('ALL')

  const units = Array.from(new Set(expenses.map((e) => e.unit).filter((u): u is string => Boolean(u)))).sort()

  const visible = unitFilter === 'ALL' ? expenses : expenses.filter((e) => e.unit === unitFilter)

  const months = getLast6Months()

  const monthlyData = months.map((date) => ({
    month: date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    amount: visible
      .filter((e) => isSameMonth(e.createdAt, date))
      .reduce((s, e) => s + e.amount, 0),
    count: visible.filter((e) => isSameMonth(e.createdAt, date)).length,
  }))

  const statusData = (
    ['DRAFT', 'SUBMIT', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const
  )
    .map((s) => ({
      name: s.charAt(0) + s.slice(1).toLowerCase(),
      value: visible.filter((e) => e.status === s).length,
      color: STATUS_COLORS[s],
    }))
    .filter((d) => d.value > 0)

  const submitted = visible.filter((e) => e.status === 'SUBMIT').length
  const approved = visible.filter((e) => e.status === 'APPROVED').length
  const reimbursed = visible.filter((e) => e.status === 'REIMBURSED').length
  const totalAmount = visible.reduce((s, e) => s + e.amount, 0)
  const reimbursedAmount = visible
    .filter((e) => e.status === 'REIMBURSED')
    .reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Company-wide expense overview</p>
        </div>
        {units.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Building className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setUnitFilter('ALL')}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  unitFilter === 'ALL'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                All Units
              </button>
              {units.map((unit) => (
                <button
                  key={unit}
                  onClick={() => setUnitFilter(unit)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    unitFilter === unit
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Expenses" value={visible.length} sub={formatIDR(totalAmount)} icon={Receipt} />
        <StatCard label="Pending Review" value={submitted} icon={Clock} />
        <StatCard label="Approved" value={approved} icon={CheckCircle} />
        <StatCard label="Reimbursed" value={reimbursed} sub={formatIDR(reimbursedAmount)} icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Donut – status breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
            <CardDescription>All expenses by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-foreground">{value}</span>
                    )}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-sm">
                          <p style={{ color: d.color }} className="font-medium">{d.name}</p>
                          <p className="text-muted-foreground">{d.value} expense{d.value !== 1 ? 's' : ''}</p>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar – monthly volume */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Monthly Volume
            </CardTitle>
            <CardDescription>Total expense amount submitted per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={45} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Recent Submissions</CardTitle>
            <CardDescription>Latest expenses across the company</CardDescription>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/admin/expenses" />}>
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {unitFilter === 'ALL' ? 'No expenses submitted yet.' : `No expenses for unit "${unitFilter}".`}
            </p>
          ) : (
            <div className="divide-y divide-border">
              {visible.slice(0, 5).map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between py-3 px-2 -mx-2 first:pt-0 last:pb-0 hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <StatusBadge status={expense.status} />
                    <span className="text-sm font-semibold text-foreground">{formatIDR(expense.amount)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Finance Dashboard ────────────────────────────────────────────────────────

function FinanceDashboard({ expenses }: { expenses: ExpenseSummary[] }) {
  const months = getLast6Months()

  const monthlyData = months.map((date) => ({
    month: date.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
    approved: expenses
      .filter((e) => e.status === 'APPROVED' && isSameMonth(e.createdAt, date))
      .reduce((s, e) => s + e.amount, 0),
    reimbursed: expenses
      .filter((e) => e.status === 'REIMBURSED' && isSameMonth(e.createdAt, date))
      .reduce((s, e) => s + e.amount, 0),
  }))

  const approvedExpenses = expenses.filter((e) => e.status === 'APPROVED')
  const reimbursedExpenses = expenses.filter((e) => e.status === 'REIMBURSED')
  const pendingPayout = approvedExpenses.reduce((s, e) => s + e.amount, 0)
  const totalReimbursed = reimbursedExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Unit expense overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Awaiting Reimbursement"
          value={approvedExpenses.length}
          sub={formatIDR(pendingPayout)}
          icon={Clock}
        />
        <StatCard
          label="Reimbursed"
          value={reimbursedExpenses.length}
          sub={formatIDR(totalReimbursed)}
          icon={CheckCircle}
        />
        <StatCard
          label="Pending Payout"
          value={formatIDR(pendingPayout)}
          icon={CreditCard}
        />
      </div>

      {/* Bar – approved vs reimbursed by month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Monthly Reimbursement Overview
          </CardTitle>
          <CardDescription>Approved vs reimbursed amounts per month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={formatCompact} tick={{ fontSize: 11 }} width={45} />
              <RechartsTooltip content={<ChartTooltip />} />
              <Legend formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
              <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reimbursed" name="Reimbursed" fill="#a855f7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Pending reimbursement list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Pending Reimbursement</CardTitle>
            <CardDescription>Approved expenses awaiting payment</CardDescription>
          </div>
          <Button size="sm" variant="outline" render={<Link href="/finance/expenses" />}>
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {approvedExpenses.length === 0 ? (
            <div className="text-center py-10">
              <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">All caught up — nothing pending.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {approvedExpenses.slice(0, 5).map((expense) => (
                <Link
                  key={expense.id}
                  href={`/expenses/${expense.id}`}
                  className="flex items-center justify-between py-3 px-2 -mx-2 first:pt-0 last:pb-0 hover:bg-accent/50 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(expense.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0 ml-4">
                    {formatIDR(expense.amount)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Employee Dashboard ───────────────────────────────────────────────────────

function EmployeeDashboard({ expenses, loading, error }: {
  expenses: ExpenseSummary[]; loading: boolean; error: string
}) {
  const submitted = expenses.filter((e) => e.status === 'SUBMIT').length
  const approved = expenses.filter((e) => e.status === 'APPROVED').length
  const reimbursed = expenses.filter((e) => e.status === 'REIMBURSED').length
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0)
  const recent = expenses.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your expense activity</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Expenses" value={expenses.length} icon={Receipt} />
        <StatCard label="Pending Review" value={submitted} icon={Clock} />
        <StatCard label="Approved" value={approved} icon={CheckCircle} />
        <StatCard label="Reimbursed" value={reimbursed} icon={FileText} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Expenses</CardTitle>
              <CardDescription>Your latest submissions</CardDescription>
            </div>
            <Button size="sm" render={<Link href="/expenses/new" />}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : recent.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No expenses yet.{' '}
                <Link href="/expenses/new" className="text-primary hover:underline">Submit one</Link>
              </div>
            ) : (
              <>
                <ul className="space-y-1">
                  {recent.map((expense) => (
                    <li key={expense.id}>
                      <Link
                        href={`/expenses/${expense.id}`}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-accent transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <StatusBadge status={expense.status} />
                          <span className="text-sm font-medium">{formatIDR(expense.amount)}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-border">
                  <Link href="/expenses" className="flex items-center gap-1 text-sm text-primary hover:underline">
                    View all expenses <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Submitted</CardTitle>
            <CardDescription>Cumulative value of all your expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-foreground">{formatIDR(totalAmount)}</p>
            <div className="mt-4 space-y-2">
              {(['DRAFT', 'SUBMIT', 'APPROVED', 'REJECTED', 'REIMBURSED'] as const).map((status) => {
                const count = expenses.filter((e) => e.status === status).length
                if (count === 0) return null
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="text-muted-foreground">{count} expense{count !== 1 ? 's' : ''}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Root Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([])
  const [adminExpenses, setAdminExpenses] = useState<AdminExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasCompany, setHasCompany] = useState(true)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    const payload = parseToken(token)
    if (!payload?.companyId) {
      setHasCompany(false)
      setLoading(false)
      return
    }
    const userRole = payload.role ?? null
    setRole(userRole)

    if (userRole === 'ADMIN') {
      api.expense.getAdminExpenses(token)
        .then(setAdminExpenses)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    } else if (userRole === 'FINANCE') {
      api.expense.getFinanceExpenses(token)
        .then(setExpenses)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    } else {
      api.expense.getMyExpenses(token)
        .then(setExpenses)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false))
    }
  }, [])

  if (!hasCompany) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Imbursare</h1>
          <p className="mt-2 text-muted-foreground max-w-sm">
            You&apos;re not part of a company yet. Create one to get started, or ask your admin to add you.
          </p>
        </div>
        <Button render={<Link href="/company/create" />}>Create a Company</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (role === 'ADMIN') return <AdminDashboard expenses={adminExpenses} />
  if (role === 'FINANCE') return <FinanceDashboard expenses={expenses} />
  return <EmployeeDashboard expenses={expenses} loading={false} error={error} />
}
