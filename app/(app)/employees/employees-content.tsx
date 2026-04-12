import { EmployeesTable } from '@/components/employees/EmployeesTable'
import { NewEmployeeButton } from '@/components/employees/EmployeeForm'
import { getServerContext } from '@/lib/context/server'
import { listEmployees } from '@/lib/services/employees'
import { listPositions } from '@/lib/services/positions'
import { listRoles } from '@/lib/services/roles'

export async function EmployeesContent() {
  const ctx = await getServerContext()
  const [employees, roles, positions] = await Promise.all([
    listEmployees(ctx),
    listRoles(ctx),
    listPositions(ctx),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {employees.length} employee{employees.length === 1 ? '' : 's'}
        </p>
        <NewEmployeeButton roles={roles} positions={positions} />
      </div>
      <EmployeesTable employees={employees} roles={roles} positions={positions} />
    </div>
  )
}
