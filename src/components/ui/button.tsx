'use client'

import { cn } from '@/lib/utils'
import { Button as AriaButton, composeRenderProps } from 'react-aria-components'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 pressed:bg-primary/80',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 pressed:bg-destructive/80',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground pressed:bg-accent/80 dark:text-white dark:border-gray-600',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 pressed:bg-secondary/70',
        ghost: 'hover:bg-accent hover:text-accent-foreground pressed:bg-accent/80 dark:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends Omit<React.ComponentProps<typeof AriaButton>, 'className' | 'isDisabled' | 'onClick'>,
    VariantProps<typeof buttonVariants> {
  className?: string
  // Support onClick for backwards compatibility (maps to onPress)
  onClick?: (() => void) | ((e: React.MouseEvent) => void)
  // Support disabled for backwards compatibility (maps to isDisabled)
  disabled?: boolean
  isDisabled?: boolean
  // Support asChild for backwards compatibility (ignored - use composition instead)
  asChild?: boolean
  // Support role for backwards compatibility
  role?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, onClick, onPress, disabled, isDisabled, asChild, role, children, ...props }, ref) => {
    // Map onClick to onPress for backwards compatibility
    // Note: onClick may expect an event, but onPress doesn't provide a React MouseEvent
    // so we call onClick without arguments (it's typically used as () => void anyway)
    const handlePress = onPress ?? (onClick as (() => void) | undefined)
    // Map disabled to isDisabled for backwards compatibility
    const buttonDisabled = isDisabled ?? disabled

    // If asChild is true, we just render the children directly
    // This is a simplified compatibility layer - for proper composition, use Button without asChild
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
        className: cn(buttonVariants({ variant, size }), (children as React.ReactElement<{ className?: string }>).props.className),
      })
    }

    return (
      <AriaButton
        ref={ref}
        onPress={handlePress}
        isDisabled={buttonDisabled}
        className={composeRenderProps(className, (className) =>
          cn(buttonVariants({ variant, size, className }))
        )}
        {...props}
      >
        {children}
      </AriaButton>
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
