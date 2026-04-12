'use client'

import { useState, useTransition } from 'react'
import { Pencil, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deactivateEmployeeAction } from '@/lib/actions/employees'
import type { EmployeeWithRelations } from '@/lib/services/employees'
import type { Position } from '@/lib/services/positions'
import type { Role } from '@/lib/services/roles'
import { EmployeeFormSheet } from './EmployeeForm'

type Props = {
  employees: EmployeeWithRelations[]
  roles: Role[]
  positions: Position[]
}

export function EmployeesTable({ employees, roles, positions }: Props) {
  const [editing, setEditing] = useState<EmployeeWithRelations | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Code</th>
              <th className="px-3 py-2 text-left font-medium">Name</th>
              <th className="px-3 py-2 text-left font-medium">Role</th>
              <th className="px-3 py-2 text-left font-medium">Position</th>
              <th className="px-3 py-2 text-left font-medium">Contact</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No employees yet. Click “New employee” to create one.
                </td>
              </tr>
            ) : (
              employees.map((e) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{e.code}</td>
                  <td className="px-3 py-2 font-medium">
                    {e.first_name} {e.last_name}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{e.role?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.position?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.email || e.phone || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        e.is_active
                          ? 'rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-600 text-xs'
                          : 'rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs'
                      }
                    >
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(e)}
                        aria-label="Edit"
                      >
                        <Pencil />
                      </Button>
                      {e.is_active && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !confirm(
                                `Deactivate employee "${e.first_name} ${e.last_name}"?`,
                              )
                            )
                              return
                            startTransition(async () => {
                              await deactivateEmployeeAction(e.id)
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
              ))
            )}
          </tbody>
        </table>
      </div>
      <EmployeeFormSheet
        open={!!editing}
        employee={editing}
        roles={roles}
        positions={positions}
        onClose={() => setEditing(null)}
      />
    </>
  )
}
