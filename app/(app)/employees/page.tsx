import { getServerContext } from '@/lib/context/server'
import { listEmployees } from '@/lib/services/employees'
import { listPositions } from '@/lib/services/positions'
import { listRoles } from '@/lib/services/roles'
import { EmployeesTable } from '@/components/employees/EmployeesTable'
import { NewEmployeeButton } from '@/components/employees/EmployeeForm'

export default async function EmployeesPage() {
  const ctx = await getServerContext()
  const [employees, roles, positions] = await Promise.all([
    listEmployees(ctx),
    listRoles(ctx),
    listPositions(ctx),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Employee listing</h2>
          <p className="text-muted-foreground text-sm">
            {employees.length} employee{employees.length === 1 ? '' : 's'}
          </p>
        </div>
        <NewEmployeeButton roles={roles} positions={positions} />
      </div>
      <EmployeesTable employees={employees} roles={roles} positions={positions} />
    </div>
  )
}
