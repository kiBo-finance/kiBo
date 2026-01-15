'use client'

import { cn } from '../../lib/utils'
import { Input as AriaInput, composeRenderProps } from 'react-aria-components'
import * as React from 'react'

export interface InputProps
  extends Omit<React.ComponentProps<typeof AriaInput>, 'className'> {
  className?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <AriaInput
        ref={ref}
        type={type}
        className={composeRenderProps(className, (className) =>
          cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-text dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400',
            className
          )
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
