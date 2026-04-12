import { getServerContext } from '@/lib/context/server'
import { listRoles } from '@/lib/services/roles'
import { NewRoleButton } from '@/components/employees/RoleForm'
import { RolesTable } from '@/components/employees/RolesTable'

export default async function EmployeesRolesPage() {
  const ctx = await getServerContext()
  const roles = await listRoles(ctx)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Roles</h2>
          <p className="text-muted-foreground text-sm">
            {roles.length} role{roles.length === 1 ? '' : 's'}
          </p>
        </div>
        <NewRoleButton />
      </div>
      <RolesTable roles={roles} />
    </div>
  )
}
