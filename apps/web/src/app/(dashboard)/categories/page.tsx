'use client'

import { useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'
import { api, type Category } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tag, Plus, X, Search } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

const inputCls = 'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-shadow disabled:opacity-50'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    const token = getToken()
    if (!token) return
    api.category.getAll(token)
      .then(setCategories)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setFormError('')
    setSaving(true)
    try {
      const token = getToken()!
      const created = await api.category.create(token, { name: name.trim() })
      setCategories((prev) => [...prev, created])
      setName('')
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create category')
    } finally {
      setSaving(false)
    }
  }

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">Manage expense categories for your company</p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setFormError('') }}>
          {showForm ? <><X className="h-4 w-4 mr-1.5" /> Cancel</> : <><Plus className="h-4 w-4 mr-1.5" /> New Category</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-5">
            <form onSubmit={handleCreate} className="flex gap-3">
              <input
                type="text"
                required
                autoFocus
                placeholder="Category name e.g. Travel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <Button type="submit" disabled={saving} className="shrink-0">
                {saving ? 'Creating…' : 'Create'}
              </Button>
            </form>
            {formError && <p className="text-sm text-destructive mt-2">{formError}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" /> Categories ({filtered.length})
            </CardTitle>
            <div className="relative w-full sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search categories…"
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
              {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {search ? 'No categories match your search.' : 'No categories yet. Create the first one.'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {paginated.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
                  >
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {cat.name}
                  </span>
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
