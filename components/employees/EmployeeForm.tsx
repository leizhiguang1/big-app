'use client'

import { useEffect, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createEmployeeAction, updateEmployeeAction } from '@/lib/actions/employees'
import { type EmployeeInput, employeeInputSchema } from '@/lib/schemas/employees'
import type { EmployeeWithRelations } from '@/lib/services/employees'
import type { Position } from '@/lib/services/positions'
import type { Role } from '@/lib/services/roles'

type Props = {
  open: boolean
  employee: EmployeeWithRelations | null
  roles: Role[]
  positions: Position[]
  onClose: () => void
}

const SELECT_CLASS =
  'h-8 rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function EmployeeFormSheet({ open, employee, roles, positions, onClose }: Props) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<EmployeeInput>({
    resolver: zodResolver(employeeInputSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      role_id: null,
      position_id: null,
      is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        first_name: employee?.first_name ?? '',
        last_name: employee?.last_name ?? '',
        email: employee?.email ?? '',
        phone: employee?.phone ?? '',
        role_id: employee?.role_id ?? null,
        position_id: employee?.position_id ?? null,
        is_active: employee?.is_active ?? true,
      })
      setServerError(null)
    }
  }, [open, employee, form])

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          role_id: values.role_id || null,
          position_id: values.position_id || null,
        }
        if (employee) {
          await updateEmployeeAction(employee.id, payload)
        } else {
          await createEmployeeAction(payload)
        }
        onClose()
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  })

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{employee ? 'Edit employee' : 'New employee'}</SheetTitle>
          <SheetDescription>
            {employee
              ? `Editing ${employee.code}.`
              : 'The employee code is auto-generated (EMP-0001) on save.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="emp-first" className="text-sm font-medium">
                First name
              </label>
              <Input id="emp-first" {...form.register('first_name')} />
              {form.formState.errors.first_name && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.first_name.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="emp-last" className="text-sm font-medium">
                Last name
              </label>
              <Input id="emp-last" {...form.register('last_name')} />
              {form.formState.errors.last_name && (
                <p className="text-destructive text-xs">
                  {form.formState.errors.last_name.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-email" className="text-sm font-medium">
              Email
            </label>
            <Input id="emp-email" type="email" {...form.register('email')} />
            {form.formState.errors.email && (
              <p className="text-destructive text-xs">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="emp-phone" className="text-sm font-medium">
              Phone
            </label>
            <Input id="emp-phone" {...form.register('phone')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="emp-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="emp-role"
                className={SELECT_CLASS}
                {...form.register('role_id')}
                defaultValue={employee?.role_id ?? ''}
              >
                <option value="">— None —</option>
                {roles
                  .filter((r) => r.is_active || r.id === employee?.role_id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="emp-position" className="text-sm font-medium">
                Position
              </label>
              <select
                id="emp-position"
                className={SELECT_CLASS}
                {...form.register('position_id')}
                defaultValue={employee?.position_id ?? ''}
              >
                <option value="">— None —</option>
                {positions
                  .filter((p) => p.is_active || p.id === employee?.position_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('is_active')} className="size-4" />
            Active
          </label>
          {serverError && <p className="text-destructive text-sm">{serverError}</p>}
          <SheetFooter className="mt-auto">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function NewEmployeeButton({ roles, positions }: { roles: Role[]; positions: Position[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>New employee</Button>
      <EmployeeFormSheet
        open={open}
        employee={null}
        roles={roles}
        positions={positions}
        onClose={() => setOpen(false)}
      />
    </>
  )
}
