'use client'

import { useState, useTransition } from 'react'
import { Pencil, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deactivateRoleAction } from '@/lib/actions/roles'
import {
  countEnabledFlags,
  TOTAL_PERMISSION_FLAGS,
} from '@/lib/schemas/role-permissions'
import type { Role } from '@/lib/services/roles'
import { RoleFormSheet } from './RoleForm'

export function RolesTable({ roles }: { roles: Role[] }) {
  const [editing, setEditing] = useState<Role | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Permissions</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No roles yet. Click “New role” to create one.
                </td>
              </tr>
            ) : (
              roles.map((role) => {
                const enabled = countEnabledFlags(role.permissions)
                const isFull = role.permissions.all
                return (
                <tr key={role.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{role.name}</td>
                  <td className="px-3 py-2">
                    {isFull ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary text-xs">
                        Full access
                      </span>
                    ) : enabled === 0 ? (
                      <span className="text-muted-foreground text-xs">None</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        {enabled} / {TOTAL_PERMISSION_FLAGS}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        role.is_active
                          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs'
                          : 'rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs'
                      }
                    >
                      {role.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(role)}
                        aria-label="Edit"
                      >
                        <Pencil />
                      </Button>
                      {role.is_active && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => {
                            if (!confirm(`Deactivate role "${role.name}"?`)) return
                            startTransition(async () => {
                              await deactivateRoleAction(role.id)
                            })
                          }}
                          aria-label="Deactivate"
                        >
                          <Power />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <RoleFormSheet
        open={!!editing}
        value={editing}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
