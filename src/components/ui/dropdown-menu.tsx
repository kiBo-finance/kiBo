'use client'

import { cn } from '@/lib/utils'
import {
  MenuTrigger,
  Menu,
  MenuItem,
  Popover,
  Separator,
  Header,
  Section,
  SubmenuTrigger,
  composeRenderProps,
  type MenuItemProps,
  type MenuProps,
} from 'react-aria-components'
import { Check, ChevronRight, Circle } from 'lucide-react'
import * as React from 'react'

// DropdownMenu root - wrapper for MenuTrigger
interface DropdownMenuProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function DropdownMenu({ children, open, onOpenChange }: DropdownMenuProps) {
  return (
    <MenuTrigger isOpen={open} onOpenChange={onOpenChange}>
      {children}
    </MenuTrigger>
  )
}

// DropdownMenuTrigger - just a slot that accepts a button
interface DropdownMenuTriggerProps {
  children?: React.ReactNode
  asChild?: boolean
}

function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  return <>{children}</>
}

// DropdownMenuGroup - Section wrapper
interface DropdownMenuGroupProps {
  children?: React.ReactNode
}

function DropdownMenuGroup({ children }: DropdownMenuGroupProps) {
  return <Section>{children}</Section>
}

// DropdownMenuPortal - no-op in React Aria (Popover handles portaling)
interface DropdownMenuPortalProps {
  children?: React.ReactNode
}

function DropdownMenuPortal({ children }: DropdownMenuPortalProps) {
  return <>{children}</>
}

// DropdownMenuSub - Submenu wrapper
// Note: In React Aria, SubmenuTrigger expects MenuItem and Popover as children
// We wrap the children to maintain backwards compatibility
interface DropdownMenuSubProps {
  children?: React.ReactNode
}

function DropdownMenuSub({ children }: DropdownMenuSubProps) {
  // Pass children directly - they should include SubTrigger and SubContent
  return <>{children}</>
}

// DropdownMenuRadioGroup
interface DropdownMenuRadioGroupProps {
  children?: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}

function DropdownMenuRadioGroup({ children }: DropdownMenuRadioGroupProps) {
  return <Section>{children}</Section>
}

// DropdownMenuSubTrigger
interface DropdownMenuSubTriggerProps extends Omit<MenuItemProps, 'className'> {
  className?: string
  inset?: boolean
  children?: React.ReactNode
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }: DropdownMenuSubTriggerProps) {
  return (
    <MenuItem
      className={composeRenderProps(className, (className) =>
        cn(
          'flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          inset && 'pl-8',
          className
        )
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto" />
    </MenuItem>
  )
}

// DropdownMenuSubContent
interface DropdownMenuSubContentProps extends Omit<MenuProps<object>, 'className'> {
  className?: string
}

function DropdownMenuSubContent({ className, ...props }: DropdownMenuSubContentProps) {
  return (
    <Popover>
      <Menu
        className={composeRenderProps(className, (className) =>
          cn(
            'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
            className
          )
        )}
        {...props}
      />
    </Popover>
  )
}

// DropdownMenuContent
interface DropdownMenuContentProps extends Omit<MenuProps<object>, 'className'> {
  className?: string
  sideOffset?: number
  // Support align for backwards compatibility (ignored in React Aria - uses automatic positioning)
  align?: 'start' | 'center' | 'end'
}

function DropdownMenuContent({ className, align, ...props }: DropdownMenuContentProps) {
  return (
    <Popover
      className={cn(
        'z-50 max-h-[var(--visual-viewport-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md dark:bg-gray-800 dark:border-gray-600 dark:text-white'
      )}
      offset={4}
    >
      <Menu
        className={composeRenderProps(className, (className) => cn('outline-none', className))}
        {...props}
      />
    </Popover>
  )
}

// DropdownMenuItem
interface DropdownMenuItemProps extends Omit<MenuItemProps, 'className'> {
  className?: string
  inset?: boolean
}

function DropdownMenuItem({ className, inset, ...props }: DropdownMenuItemProps) {
  return (
    <MenuItem
      className={composeRenderProps(className, (className) =>
        cn(
          'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          inset && 'pl-8',
          className
        )
      )}
      {...props}
    />
  )
}

// DropdownMenuCheckboxItem
interface DropdownMenuCheckboxItemProps extends Omit<MenuItemProps, 'className' | 'children'> {
  className?: string
  checked?: boolean
  children?: React.ReactNode
}

function DropdownMenuCheckboxItem({
  className,
  checked,
  children,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <MenuItem
      className={composeRenderProps(className, (className) =>
        cn(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Check className="h-4 w-4" />}
      </span>
      {children}
    </MenuItem>
  )
}

// DropdownMenuRadioItem
interface DropdownMenuRadioItemProps extends Omit<MenuItemProps, 'className' | 'children'> {
  className?: string
  children?: React.ReactNode
  checked?: boolean
}

function DropdownMenuRadioItem({ className, children, checked, ...props }: DropdownMenuRadioItemProps) {
  return (
    <MenuItem
      className={composeRenderProps(className, (className) =>
        cn(
          'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {checked && <Circle className="h-2 w-2 fill-current" />}
      </span>
      {children}
    </MenuItem>
  )
}

// DropdownMenuLabel
interface DropdownMenuLabelProps {
  className?: string
  inset?: boolean
  children?: React.ReactNode
}

function DropdownMenuLabel({ className, inset, children }: DropdownMenuLabelProps) {
  return (
    <Header className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}>
      {children}
    </Header>
  )
}

// DropdownMenuSeparator
interface DropdownMenuSeparatorProps {
  className?: string
}

function DropdownMenuSeparator({ className }: DropdownMenuSeparatorProps) {
  return <Separator className={cn('-mx-1 my-1 h-px bg-muted', className)} />
}

// DropdownMenuShortcut
interface DropdownMenuShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {}

function DropdownMenuShortcut({ className, ...props }: DropdownMenuShortcutProps) {
  return <span className={cn('ml-auto text-xs tracking-widest opacity-60', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
