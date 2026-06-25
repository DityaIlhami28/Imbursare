const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message ?? 'Request failed')
  }

  return res.json() as Promise<T>
}

function auth(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export type ExpenseStatus = 'DRAFT' | 'SUBMIT' | 'APPROVED' | 'REJECTED' | 'REIMBURSED'
export type CompanyRole = 'EMPLOYEE' | 'FINANCE' | 'ADMIN'

export interface ExpenseSummary {
  id: string
  title: string
  amount: number
  status: ExpenseStatus
  createdAt: string
}

export interface ExpenseDetail {
  id: string
  title: string
  description: string
  amount: number
  status: ExpenseStatus
  attachments: { id: string; fileName: string; fileUrl: string; fileType: string; size: number }[]
  category: { id: string; name: string } | null
  createdAt: string
}

export interface ExpenseLog {
  id: string
  action: string
  message: string
  createdById: string
  createdAt: string
}

export interface EmployeeSummary {
  id: string
  email: string
  fullName: string
  position: { id: string; name: string } | null
  unit: string | null
}

export interface EmployeeDetail {
  id: string
  email: string
  fullName: string
  position: { id: string; name: string } | null
  address: string | null
  phone: string | null
  unit: string | null
  supervisor: { id: string; fullName: string } | null
  subordinates: { id: string; fullName: string }[]
}

export interface Position {
  id: string
  name: string
  level: number
}

export interface Category {
  id: string
  name: string
}

export interface AmountPolicy {
  id: string
  maxAmount: number
  level: number
  totalTransactions: number
}

export const api = {
  auth: {
    login: (body: { email: string; password: string }) =>
      request<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    register: (body: { email: string; password: string }) =>
      request<{ id: string; email: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  user: {
    getProfile: (token: string) =>
      request<{ email: string; company: string | null; role: CompanyRole | null }>('/user/profile', {
        headers: auth(token),
      }),
  },

  company: {
    create: (token: string, body: { name: string }) =>
      request<{ id: string; name: string }>('/company', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
    addUser: (token: string, body: { fullName: string; email: string; role: CompanyRole }) =>
      request<unknown>('/company/add-user', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
    getEmployees: (token: string) =>
      request<EmployeeSummary[]>('/company/employees', {
        headers: auth(token),
      }),
    getEmployee: (token: string, id: string) =>
      request<EmployeeDetail>(`/company/employee/${id}`, {
        headers: auth(token),
      }),
    updateEmployee: (token: string, id: string, body: Record<string, unknown>) =>
      request<unknown>(`/company/employee/${id}`, {
        method: 'PATCH',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
  },

  category: {
    create: (token: string, body: { name: string }) =>
      request<Category>('/category/add-category', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
    getAll: (token: string) =>
      request<Category[]>('/category/get-categories', {
        headers: auth(token),
      }),
  },

  positions: {
    getAll: (token: string) =>
      request<Position[]>('/positions', {
        headers: auth(token),
      }),
    create: (token: string, body: { name: string; positionLevel: string }) =>
      request<Position>('/positions/create-position', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
    get: (token: string, id: string) =>
      request<Position & { employees: { id: string; fullName: string }[] }>(`/positions/${id}`, {
        headers: auth(token),
      }),
  },

  policies: {
    getAll: (token: string) =>
      request<AmountPolicy[]>('/amount-policy', {
        headers: auth(token),
      }),
    create: (token: string, body: { maxAmount: number; positionLevel: string; totalTransactions: number }) =>
      request<AmountPolicy>('/amount-policy/create-amount-policy', {
        method: 'POST',
        headers: auth(token),
        body: JSON.stringify(body),
      }),
  },

  expense: {
    create: (token: string, formData: FormData) =>
      fetch(`${BASE_URL}/expense/create-expense`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message ?? 'Request failed')
        }
        return res.json() as Promise<{ message: string; expenseId: string; status: string }>
      }),
    getMyExpenses: (token: string) =>
      request<ExpenseSummary[]>('/expense/my-expenses', {
        headers: auth(token),
      }),
    getAdminExpenses: (token: string) =>
      request<(ExpenseSummary & { userId: string; companyId: string })[]>('/expense/company-expenses-for-admin', {
        headers: auth(token),
      }),
    getFinanceExpenses: (token: string) =>
      request<ExpenseSummary[]>('/expense/company-expenses-for-finance', {
        headers: auth(token),
      }),
    getDetails: (token: string, id: string) =>
      request<ExpenseDetail>(`/expense/${id}`, {
        headers: auth(token),
      }),
    getLogs: (token: string, id: string) =>
      request<ExpenseLog[]>(`/expense/logs/${id}`, {
        headers: auth(token),
      }),
  },
}
