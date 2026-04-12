import { NewRoleButton } from '@/components/employees/RoleForm'
import { RolesTable } from '@/components/employees/RolesTable'
import { getServerContext } from '@/lib/context/server'
import { listRoles } from '@/lib/services/roles'

export async function RolesContent() {
  const ctx = await getServerContext()
  const roles = await listRoles(ctx)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {roles.length} role{roles.length === 1 ? '' : 's'}
        </p>
        <NewRoleButton />
      </div>
      <RolesTable roles={roles} />
    </div>
  )
}
