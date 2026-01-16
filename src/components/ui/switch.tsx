'use client'

import { cn } from '@/lib/utils'
import { Switch as AriaSwitch, composeRenderProps } from 'react-aria-components'
import * as React from 'react'

export interface SwitchProps
  extends Omit<React.ComponentProps<typeof AriaSwitch>, 'className' | 'children' | 'isSelected' | 'onChange' | 'isDisabled'> {
  className?: string
  children?: React.ReactNode
  // Support checked for backwards compatibility (maps to isSelected)
  checked?: boolean
  isSelected?: boolean
  // Support onCheckedChange for backwards compatibility (maps to onChange)
  onCheckedChange?: (checked: boolean) => void
  onChange?: (isSelected: boolean) => void
  // Support disabled for backwards compatibility (maps to isDisabled)
  disabled?: boolean
  isDisabled?: boolean
}

const Switch = React.forwardRef<HTMLLabelElement, SwitchProps>(
  ({ className, children, checked, isSelected, onCheckedChange, onChange, disabled, isDisabled, ...props }, ref) => {
    // Map checked to isSelected for backwards compatibility
    const selected = isSelected ?? checked
    // Map onCheckedChange to onChange for backwards compatibility
    const handleChange = onChange ?? onCheckedChange
    // Map disabled to isDisabled for backwards compatibility
    const switchDisabled = isDisabled ?? disabled

    return (
      <AriaSwitch
        ref={ref}
        isSelected={selected}
        onChange={handleChange}
        isDisabled={switchDisabled}
        className={composeRenderProps(className, (className) =>
          cn('group inline-flex items-center gap-2', className)
        )}
        {...props}
      >
        {({ isSelected }) => (
        <>
          <div
            className={cn(
              'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-50',
              isSelected
                ? 'bg-blue-600 dark:bg-blue-500'
                : 'bg-gray-200 dark:bg-gray-700',
              'dark:focus-visible:ring-offset-gray-900'
            )}
          >
            <div
              className={cn(
                'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
                isSelected ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </div>
          {children}
        </>
      )}
    </AriaSwitch>
    )
  }
)
Switch.displayName = 'Switch'

export { Switch }
