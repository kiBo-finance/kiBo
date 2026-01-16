'use client'

import { cn } from '@/lib/utils'
import { Checkbox as AriaCheckbox, composeRenderProps } from 'react-aria-components'
import { Check } from 'lucide-react'
import * as React from 'react'

export interface CheckboxProps
  extends Omit<React.ComponentProps<typeof AriaCheckbox>, 'className' | 'children' | 'isSelected' | 'onChange'> {
  className?: string
  children?: React.ReactNode
  // Support checked for backwards compatibility (maps to isSelected)
  checked?: boolean
  isSelected?: boolean
  // Support onCheckedChange for backwards compatibility (maps to onChange)
  onCheckedChange?: (checked: boolean) => void
  onChange?: (isSelected: boolean) => void
}

const Checkbox = React.forwardRef<HTMLLabelElement, CheckboxProps>(
  ({ className, children, checked, isSelected, onCheckedChange, onChange, ...props }, ref) => {
    // Map checked to isSelected for backwards compatibility
    const selected = isSelected ?? checked
    // Map onCheckedChange to onChange for backwards compatibility
    const handleChange = onChange ?? onCheckedChange

    return (
      <AriaCheckbox
        ref={ref}
        isSelected={selected}
        onChange={handleChange}
        className={composeRenderProps(className, (className) =>
          cn('group flex items-center gap-2', className)
        )}
        {...props}
      >
        {({ isSelected, isIndeterminate }) => (
        <>
          <div
            className={cn(
              'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group-data-[disabled]:cursor-not-allowed group-data-[disabled]:opacity-50',
              (isSelected || isIndeterminate) && 'bg-primary text-primary-foreground'
            )}
          >
            {(isSelected || isIndeterminate) && (
              <div className="flex items-center justify-center text-current">
                <Check className="h-4 w-4" />
              </div>
            )}
          </div>
          {children}
        </>
      )}
    </AriaCheckbox>
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
