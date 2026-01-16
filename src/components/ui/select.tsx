'use client'

import { cn } from '@/lib/utils'
import {
  Select as AriaSelect,
  SelectValue as AriaSelectValue,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  Label,
  Section,
  Header,
  composeRenderProps,
  type SelectProps as AriaSelectProps,
  type ListBoxItemProps,
  type SectionProps,
} from 'react-aria-components'
import { Check, ChevronDown } from 'lucide-react'
import * as React from 'react'

// Re-export types for backwards compatibility
export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, 'selectedKey' | 'defaultSelectedKey' | 'onSelectionChange' | 'isRequired'> {
  className?: string
  // Support value/defaultValue for backwards compatibility (maps to selectedKey/defaultSelectedKey)
  value?: string
  defaultValue?: string
  selectedKey?: string | null
  defaultSelectedKey?: string
  // Support onValueChange for backwards compatibility (maps to onSelectionChange)
  onValueChange?: (value: string) => void
  onSelectionChange?: (key: string | null) => void
  // Support required for backwards compatibility (maps to isRequired)
  required?: boolean
  isRequired?: boolean
}

function Select<T extends object>({
  className,
  children,
  value,
  defaultValue,
  selectedKey,
  defaultSelectedKey,
  onValueChange,
  onSelectionChange,
  required,
  isRequired,
  ...props
}: SelectProps<T>) {
  // Map value to selectedKey for backwards compatibility
  const key = selectedKey ?? value ?? undefined
  const defaultKey = defaultSelectedKey ?? defaultValue ?? undefined
  // Map onValueChange to onSelectionChange for backwards compatibility
  const handleSelectionChange = (newKey: React.Key | null) => {
    if (onSelectionChange) {
      onSelectionChange(newKey as string | null)
    } else if (onValueChange && newKey) {
      onValueChange(String(newKey))
    }
  }
  // Map required to isRequired for backwards compatibility
  const selectRequired = isRequired ?? required

  return (
    <AriaSelect
      selectedKey={key}
      defaultSelectedKey={defaultKey}
      onSelectionChange={handleSelectionChange}
      isRequired={selectRequired}
      className={composeRenderProps(className, (className) => cn('flex flex-col gap-1', className))}
      {...props}
    >
      {children}
    </AriaSelect>
  )
}

// SelectGroup - use React Aria Section for proper ListBox integration
interface SelectGroupProps extends Omit<SectionProps<object>, 'className'> {
  className?: string
  children?: React.ReactNode
}

function SelectGroup({ className, children, ...props }: SelectGroupProps) {
  return (
    <Section className={cn('', className)} {...props}>
      {children}
    </Section>
  )
}

// SelectValue wrapper
interface SelectValueProps {
  placeholder?: string
  className?: string
}

function SelectValue({ placeholder, className }: SelectValueProps) {
  return (
    <AriaSelectValue
      className={composeRenderProps(className, (className) =>
        cn('[&>span]:line-clamp-1', className)
      )}
    >
      {({ selectedText }) => selectedText || placeholder}
    </AriaSelectValue>
  )
}

// SelectTrigger
interface SelectTriggerProps extends React.ComponentProps<typeof Button> {
  className?: string
  children?: React.ReactNode
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => (
    <Button
      ref={ref}
      className={composeRenderProps(className, (className) =>
        cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-gray-800 dark:border-gray-600 dark:text-white',
          className
        )
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" aria-hidden="true" />
    </Button>
  )
)
SelectTrigger.displayName = 'SelectTrigger'

// SelectContent
interface SelectContentProps {
  className?: string
  children?: React.ReactNode
}

function SelectContent({ className, children }: SelectContentProps) {
  return (
    <Popover
      className={composeRenderProps(className, (className) =>
        cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-white text-gray-900 shadow-lg dark:bg-gray-800 dark:border-gray-600 dark:text-white',
          className
        )
      )}
    >
      <ListBox className="p-1">{children}</ListBox>
    </Popover>
  )
}

// SelectLabel - use React Aria Header for proper Section integration
interface SelectLabelProps {
  className?: string
  children?: React.ReactNode
}

function SelectLabel({ className, children }: SelectLabelProps) {
  return <Header className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold text-muted-foreground', className)}>{children}</Header>
}

// SelectItem
interface SelectItemProps extends Omit<ListBoxItemProps, 'className' | 'children' | 'id' | 'isDisabled' | 'value' | 'textValue'> {
  className?: string
  children?: React.ReactNode
  // Support value for backwards compatibility (maps to id)
  value?: string
  id?: string
  // Support disabled for backwards compatibility (maps to isDisabled)
  disabled?: boolean
  isDisabled?: boolean
  // textValue for accessibility and display in SelectValue
  textValue?: string
}

function SelectItem({ className, children, value, id, disabled, isDisabled, textValue, ...props }: SelectItemProps) {
  // Map value to id for backwards compatibility
  const itemId = id ?? value
  // Map disabled to isDisabled for backwards compatibility
  const itemDisabled = isDisabled ?? disabled
  // Extract textValue from children if not provided and children is a string
  const derivedTextValue = textValue ?? (typeof children === 'string' ? children : undefined)

  return (
    <ListBoxItem
      id={itemId}
      isDisabled={itemDisabled}
      textValue={derivedTextValue}
      className={composeRenderProps(className, (className) =>
        cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-blue-50 focus:text-blue-900 hover:bg-gray-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 dark:focus:bg-blue-600 dark:focus:text-white dark:hover:bg-gray-600',
          className
        )
      )}
      {...props}
    >
      {({ isSelected }) => (
        <>
          <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            {isSelected && <Check className="h-4 w-4" />}
          </span>
          {children}
        </>
      )}
    </ListBoxItem>
  )
}

// SelectSeparator
interface SelectSeparatorProps {
  className?: string
}

function SelectSeparator({ className }: SelectSeparatorProps) {
  return <div className={cn('-mx-1 my-1 h-px bg-muted', className)} role="separator" />
}

// Scroll buttons (no-op in React Aria, scrolling is automatic)
function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
