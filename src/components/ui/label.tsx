'use client'

import { cn } from '../../lib/utils'
import { Label as AriaLabel } from 'react-aria-components'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-white'
)

export interface LabelProps
  extends Omit<React.ComponentProps<typeof AriaLabel>, 'className'>,
    VariantProps<typeof labelVariants> {
  className?: string
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <AriaLabel
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = 'Label'

export { Label }
