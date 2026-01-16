'use client'

import { cn } from '@/lib/utils'
import {
  TooltipTrigger as AriaTooltipTrigger,
  Tooltip as AriaTooltip,
  composeRenderProps,
  type TooltipProps as AriaTooltipProps,
} from 'react-aria-components'
import * as React from 'react'

// TooltipProvider - no-op in React Aria (not needed)
interface TooltipProviderProps {
  children?: React.ReactNode
  delayDuration?: number
  skipDelayDuration?: number
}

function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>
}

// Tooltip root - wrapper for TooltipTrigger
interface TooltipProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
}

function Tooltip({ children, open, onOpenChange, delayDuration = 700 }: TooltipProps) {
  return (
    <AriaTooltipTrigger isOpen={open} onOpenChange={onOpenChange} delay={delayDuration}>
      {children}
    </AriaTooltipTrigger>
  )
}

// TooltipTrigger - just a slot that accepts a button
interface TooltipTriggerProps {
  children?: React.ReactNode
  asChild?: boolean
}

function TooltipTrigger({ children }: TooltipTriggerProps) {
  return <>{children}</>
}

// TooltipContent
interface TooltipContentProps extends Omit<AriaTooltipProps, 'className' | 'children'> {
  className?: string
  children?: React.ReactNode
  sideOffset?: number
}

function TooltipContent({ className, children, sideOffset = 4, ...props }: TooltipContentProps) {
  return (
    <AriaTooltip
      offset={sideOffset}
      className={composeRenderProps(className, (className) =>
        cn(
          'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
          className
        )
      )}
      {...props}
    >
      {children}
    </AriaTooltip>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
