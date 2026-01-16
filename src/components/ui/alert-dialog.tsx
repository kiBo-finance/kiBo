'use client'

import { buttonVariants } from './button'
import { cn } from '@/lib/utils'
import {
  DialogTrigger as AriaDialogTrigger,
  Modal,
  ModalOverlay,
  Dialog as AriaDialog,
  Heading,
  composeRenderProps,
  type ModalOverlayProps,
} from 'react-aria-components'
import * as React from 'react'

// AlertDialogClose context for Action/Cancel buttons
const AlertDialogCloseContext = React.createContext<(() => void) | null>(null)

// AlertDialog root - wrapper for DialogTrigger
interface AlertDialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function AlertDialog({ children, open, onOpenChange }: AlertDialogProps) {
  const closeDialog = React.useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  return (
    <AlertDialogCloseContext.Provider value={closeDialog}>
      <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange}>
        {children}
      </AriaDialogTrigger>
    </AlertDialogCloseContext.Provider>
  )
}

// AlertDialogTrigger - just a slot that accepts a button
interface AlertDialogTriggerProps {
  children?: React.ReactNode
  asChild?: boolean
}

function AlertDialogTrigger({ children }: AlertDialogTriggerProps) {
  return <>{children}</>
}

// AlertDialogPortal - no-op in React Aria (Modal handles portaling)
interface AlertDialogPortalProps {
  children?: React.ReactNode
}

function AlertDialogPortal({ children }: AlertDialogPortalProps) {
  return <>{children}</>
}

// AlertDialogOverlay
interface AlertDialogOverlayProps extends Omit<ModalOverlayProps, 'className'> {
  className?: string
}

function AlertDialogOverlay({ className, ...props }: AlertDialogOverlayProps) {
  return (
    <ModalOverlay
      className={composeRenderProps(className, (className) =>
        cn('fixed inset-0 z-50 bg-black/80 dark:bg-black/90', className)
      )}
      {...props}
    />
  )
}

// AlertDialogContent
interface AlertDialogContentProps {
  className?: string
  children?: React.ReactNode
}

function AlertDialogContent({ className, children }: AlertDialogContentProps) {
  return (
    <ModalOverlay
      isDismissable={false}
      className="fixed inset-0 z-50 bg-black/80 dark:bg-black/90"
    >
      <Modal
        isDismissable={false}
        className={composeRenderProps(className, (className) =>
          cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg dark:bg-gray-900 dark:border-gray-700',
            className
          )
        )}
      >
        <AriaDialog role="alertdialog" className="outline-none">
          {children}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  )
}

// AlertDialogHeader
interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function AlertDialogHeader({ className, ...props }: AlertDialogHeaderProps) {
  return <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
}

// AlertDialogFooter
interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function AlertDialogFooter({ className, ...props }: AlertDialogFooterProps) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

// AlertDialogTitle
interface AlertDialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function AlertDialogTitle({ className, children, ...props }: AlertDialogTitleProps) {
  return (
    <Heading
      slot="title"
      className={cn('text-lg font-semibold dark:text-white', className)}
      {...props}
    >
      {children}
    </Heading>
  )
}

// AlertDialogDescription
interface AlertDialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function AlertDialogDescription({ className, ...props }: AlertDialogDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground dark:text-gray-300', className)} {...props} />
}

// AlertDialogAction
interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function AlertDialogAction({ className, onClick, ...props }: AlertDialogActionProps) {
  const close = React.useContext(AlertDialogCloseContext)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    close?.()
  }

  return (
    <button
      type="button"
      className={cn(buttonVariants(), className)}
      onClick={handleClick}
      {...props}
    />
  )
}

// AlertDialogCancel
interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function AlertDialogCancel({ className, onClick, ...props }: AlertDialogCancelProps) {
  const close = React.useContext(AlertDialogCloseContext)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    close?.()
  }

  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
      onClick={handleClick}
      {...props}
    />
  )
}

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
