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
import { createPositionAction, updatePositionAction } from '@/lib/actions/positions'
import { type PositionInput, positionInputSchema } from '@/lib/schemas/positions'
import type { Position } from '@/lib/services/positions'

type Props = {
  open: boolean
  position: Position | null
  onClose: () => void
}

export function PositionFormSheet({ open, position, onClose }: Props) {
  const [pending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<PositionInput>({
    resolver: zodResolver(positionInputSchema),
    defaultValues: { name: '', description: '', is_active: true },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        name: position?.name ?? '',
        description: position?.description ?? '',
        is_active: position?.is_active ?? true,
      })
      setServerError(null)
    }
  }, [open, position, form])

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      try {
        if (position) {
          await updatePositionAction(position.id, values)
        } else {
          await createPositionAction(values)
        }
        onClose()
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  })

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{position ? 'Edit position' : 'New position'}</SheetTitle>
          <SheetDescription>
            Positions are job title labels shown on the employee card and roster.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="position-name" className="text-sm font-medium">
              Name
            </label>
            <Input id="position-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="position-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="position-description"
              {...form.register('description')}
              rows={3}
              className="min-h-20 rounded-md border bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
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

export function NewPositionButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>New position</Button>
      <PositionFormSheet open={open} position={null} onClose={() => setOpen(false)} />
    </>
  )
}
