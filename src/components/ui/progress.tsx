'use client'

import { cn } from '@/lib/utils'
import { ProgressBar as AriaProgressBar, composeRenderProps } from 'react-aria-components'
import * as React from 'react'

export interface ProgressProps
  extends Omit<React.ComponentProps<typeof AriaProgressBar>, 'className' | 'children'> {
  className?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, ...props }, ref) => (
    <AriaProgressBar
      ref={ref}
      value={value}
      className={composeRenderProps(className, (className) =>
        cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)
      )}
      {...props}
    >
      {({ percentage }) => (
        <div
          className="h-full w-full flex-1 bg-primary transition-all"
          style={{ transform: `translateX(-${100 - (percentage || 0)}%)` }}
        />
      )}
    </AriaProgressBar>
  )
)
Progress.displayName = 'Progress'

export { Progress }
