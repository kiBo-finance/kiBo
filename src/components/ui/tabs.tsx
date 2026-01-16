'use client'

import { cn } from '@/lib/utils'
import {
  Tabs as AriaTabs,
  TabList,
  Tab,
  TabPanel,
  composeRenderProps,
  type TabsProps as AriaTabsProps,
  type TabProps,
  type TabPanelProps,
  type TabListProps,
} from 'react-aria-components'
import * as React from 'react'

// Tabs root
interface TabsProps extends Omit<AriaTabsProps, 'className' | 'selectedKey' | 'defaultSelectedKey' | 'onSelectionChange'> {
  className?: string
  // Support value/defaultValue for backwards compatibility (maps to selectedKey/defaultSelectedKey)
  value?: string
  defaultValue?: string
  selectedKey?: string
  defaultSelectedKey?: string
  // Support onValueChange for backwards compatibility (maps to onSelectionChange)
  onValueChange?: (value: string) => void
  onSelectionChange?: (key: string) => void
}

function Tabs({
  className,
  value,
  defaultValue,
  selectedKey,
  defaultSelectedKey,
  onValueChange,
  onSelectionChange,
  ...props
}: TabsProps) {
  // Map value to selectedKey for backwards compatibility
  const key = selectedKey ?? value ?? undefined
  const defaultKey = defaultSelectedKey ?? defaultValue ?? undefined
  // Map onValueChange to onSelectionChange for backwards compatibility
  const handleSelectionChange = (newKey: React.Key) => {
    if (onSelectionChange) {
      onSelectionChange(String(newKey))
    } else if (onValueChange) {
      onValueChange(String(newKey))
    }
  }

  return (
    <AriaTabs
      selectedKey={key}
      defaultSelectedKey={defaultKey}
      onSelectionChange={handleSelectionChange}
      className={composeRenderProps(className, (className) => cn('w-full', className))}
      {...props}
    />
  )
}

// TabsList
interface TabsListProps extends Omit<TabListProps<object>, 'className'> {
  className?: string
}

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabList
      className={composeRenderProps(className, (className) =>
        cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
          className
        )
      )}
      {...props}
    />
  )
}

// TabsTrigger
interface TabsTriggerProps extends Omit<TabProps, 'className'> {
  className?: string
  value?: string
}

function TabsTrigger({ className, value, id, ...props }: TabsTriggerProps) {
  return (
    <Tab
      id={id ?? value}
      className={composeRenderProps(className, (className) =>
        cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm',
          className
        )
      )}
      {...props}
    />
  )
}

// TabsContent
interface TabsContentProps extends Omit<TabPanelProps, 'className'> {
  className?: string
  value?: string
}

function TabsContent({ className, value, id, ...props }: TabsContentProps) {
  return (
    <TabPanel
      id={id ?? value}
      className={composeRenderProps(className, (className, renderProps) =>
        cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Animation for tab content
          'data-[inert]:hidden',
          className
        )
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
