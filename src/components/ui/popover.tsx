'use client'

import { cn } from '@/lib/utils'
import {
  DialogTrigger,
  Popover as AriaPopover,
  Dialog,
  composeRenderProps,
  type PopoverProps as AriaPopoverProps,
} from 'react-aria-components'
import * as React from 'react'

// Popover root - wrapper for DialogTrigger
interface PopoverProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Popover({ children, open, onOpenChange }: PopoverProps) {
  return (
    <DialogTrigger isOpen={open} onOpenChange={onOpenChange}>
      {children}
    </DialogTrigger>
  )
}

// PopoverTrigger - just a slot that accepts a button
interface PopoverTriggerProps {
  children?: React.ReactNode
  asChild?: boolean
}

function PopoverTrigger({ children }: PopoverTriggerProps) {
  return <>{children}</>
}

// PopoverContent
interface PopoverContentProps extends Omit<AriaPopoverProps, 'className' | 'children'> {
  className?: string
  children?: React.ReactNode
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
}

function PopoverContent({
  className,
  children,
  align = 'center',
  sideOffset = 4,
  ...props
}: PopoverContentProps) {
  // Map align to crossOffset
  const crossOffset = align === 'start' ? -8 : align === 'end' ? 8 : 0

  return (
    <AriaPopover
      offset={sideOffset}
      crossOffset={crossOffset}
      className={composeRenderProps(className, (className) =>
        cn(
          'z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white',
          className
        )
      )}
      {...props}
    >
      <Dialog className="outline-none">{children}</Dialog>
    </AriaPopover>
  )
}

export { Popover, PopoverTrigger, PopoverContent }
