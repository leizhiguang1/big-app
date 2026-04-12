import type { ReactNode } from 'react'
import { EmployeesTabs } from '@/components/employees/EmployeesTabs'

export default function EmployeesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Employees</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Staff directory, roles, positions, and commission rules.
        </p>
      </div>
      <EmployeesTabs />
      {children}
    </div>
  )
}
