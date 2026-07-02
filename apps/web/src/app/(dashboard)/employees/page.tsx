'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getToken } from '@/lib/auth'
import { api, type EmployeeSummary } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus, ChevronRight } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeSummary[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.company.getEmployees(token)
      .then(setEmployees)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.unit ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employees</h1>
          <p className="text-sm text-muted-foreground">Manage your company&apos;s team members</p>
        </div>
        <Button render={<Link href="/employees/add" />}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Employee
        </Button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search by name, email, or unit…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Team Members ({filtered.length})
          </CardTitle>
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
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search ? 'No employees match your search.' : 'No employees yet.'}
              </p>
              {!search && (
                <Link href="/employees/add" className="mt-2 inline-block text-sm text-primary hover:underline">
                  Add the first employee
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="divide-y divide-border">
                {paginated.map((emp) => (
                  <Link
                    key={emp.id}
                    href={`/employees/${emp.id}`}
                    className="flex items-center justify-between py-3 px-2 -mx-2 first:pt-0 last:pb-0 hover:bg-accent/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-primary">
                          {emp.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{emp.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        {emp.position && (
                          <p className="text-xs font-medium text-foreground">{emp.position.name}</p>
                        )}
                        {emp.unit && (
                          <p className="text-xs text-muted-foreground">{emp.unit}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
