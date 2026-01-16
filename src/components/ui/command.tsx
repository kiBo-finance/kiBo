'use client'

import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'
import * as React from 'react'

// Dialog wrapper for Command (for backwards compatibility)
interface CommandDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const CommandDialog = ({ children, open, onOpenChange }: CommandDialogProps) => {
  // Simple dialog wrapper - uses the Dialog component from the project
  const Dialog = React.lazy(() => import('./dialog').then(m => ({ default: m.Dialog })))
  const DialogContent = React.lazy(() => import('./dialog').then(m => ({ default: m.DialogContent })))

  return (
    <React.Suspense fallback={null}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground dark:bg-gray-800 dark:text-white [&_[data-command-group-heading]]:px-2 [&_[data-command-group-heading]]:font-medium [&_[data-command-group-heading]]:text-muted-foreground [&_[data-command-group]:not([hidden])_~[data-command-group]]:pt-0 [&_[data-command-group]]:px-2 [&_[data-command-input-wrapper]_svg]:h-5 [&_[data-command-input-wrapper]_svg]:w-5 [&_[data-command-input]]:h-12 [&_[data-command-item]]:px-2 [&_[data-command-item]]:py-3 [&_[data-command-item]_svg]:h-5 [&_[data-command-item]_svg]:w-5">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    </React.Suspense>
  )
}

// Command container
interface CommandProps {
  className?: string
  children?: React.ReactNode
}

const CommandContext = React.createContext<{
  filter: string
  setFilter: (value: string) => void
}>({
  filter: '',
  setFilter: () => {},
})

const Command = React.forwardRef<HTMLDivElement, CommandProps>(({ className, children }, ref) => {
  const [filter, setFilter] = React.useState('')

  return (
    <CommandContext.Provider value={{ filter, setFilter }}>
      <div
        ref={ref}
        className={cn(
          'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground dark:bg-gray-800 dark:text-white',
          className
        )}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
})
Command.displayName = 'Command'

// Command Input
interface CommandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, placeholder, ...props }, ref) => {
    const { setFilter } = React.useContext(CommandContext)

    return (
      <div className="flex items-center border-b px-3 dark:border-gray-600" data-command-input-wrapper="">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={ref}
          type="text"
          placeholder={placeholder}
          onChange={(e) => setFilter(e.target.value)}
          className={cn(
            'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:text-white dark:placeholder:text-gray-400',
            className
          )}
          data-command-input=""
          {...props}
        />
      </div>
    )
  }
)
CommandInput.displayName = 'CommandInput'

// Command List
interface CommandListProps {
  className?: string
  children?: React.ReactNode
}

const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
      >
        {children}
      </div>
    )
  }
)
CommandList.displayName = 'CommandList'

// Command Empty
interface CommandEmptyProps {
  className?: string
  children?: React.ReactNode
}

const CommandEmpty = React.forwardRef<HTMLDivElement, CommandEmptyProps>(
  ({ className, children }, ref) => {
    const { filter } = React.useContext(CommandContext)
    const [hasVisibleItems, setHasVisibleItems] = React.useState(true)

    // This is a simplified implementation - in a real app you'd need to
    // check if any items match the filter
    React.useEffect(() => {
      // Simple check - if filter is empty, assume items exist
      setHasVisibleItems(filter === '')
    }, [filter])

    if (hasVisibleItems && filter === '') return null

    return (
      <div ref={ref} className={cn('py-6 text-center text-sm', className)}>
        {children}
      </div>
    )
  }
)
CommandEmpty.displayName = 'CommandEmpty'

// Command Group
interface CommandGroupProps {
  className?: string
  children?: React.ReactNode
  heading?: string
}

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden p-1 text-foreground [&_[data-command-group-heading]]:px-2 [&_[data-command-group-heading]]:py-1.5 [&_[data-command-group-heading]]:text-xs [&_[data-command-group-heading]]:font-medium [&_[data-command-group-heading]]:text-muted-foreground dark:text-white dark:[&_[data-command-group-heading]]:text-gray-300',
          className
        )}
        data-command-group=""
      >
        {heading && (
          <div data-command-group-heading="" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {heading}
          </div>
        )}
        {children}
      </div>
    )
  }
)
CommandGroup.displayName = 'CommandGroup'

// Command Separator
interface CommandSeparatorProps {
  className?: string
}

const CommandSeparator = React.forwardRef<HTMLDivElement, CommandSeparatorProps>(
  ({ className }, ref) => {
    return <div ref={ref} className={cn('-mx-1 h-px bg-border', className)} />
  }
)
CommandSeparator.displayName = 'CommandSeparator'

// Command Item
interface CommandItemProps {
  className?: string
  children?: React.ReactNode
  value?: string
  onSelect?: () => void
  disabled?: boolean
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className, children, value, onSelect, disabled }, ref) => {
    const { filter } = React.useContext(CommandContext)
    const [isSelected, setIsSelected] = React.useState(false)

    // Filter logic - check if value contains filter string
    const shouldShow = React.useMemo(() => {
      if (!filter) return true
      if (!value) return true
      return value.toLowerCase().includes(filter.toLowerCase())
    }, [filter, value])

    if (!shouldShow) return null

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer hover:bg-accent dark:hover:bg-gray-700",
          isSelected && "bg-accent dark:bg-gray-700",
          className
        )}
        data-command-item=""
        data-disabled={disabled}
        data-selected={isSelected}
        onClick={() => {
          if (!disabled && onSelect) {
            onSelect()
          }
        }}
        onMouseEnter={() => setIsSelected(true)}
        onMouseLeave={() => setIsSelected(false)}
        role="option"
        aria-selected={isSelected}
        aria-disabled={disabled}
      >
        {children}
      </div>
    )
  }
)
CommandItem.displayName = 'CommandItem'

// Command Shortcut
interface CommandShortcutProps extends React.HTMLAttributes<HTMLSpanElement> {
  className?: string
}

const CommandShortcut = ({ className, ...props }: CommandShortcutProps) => {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}
