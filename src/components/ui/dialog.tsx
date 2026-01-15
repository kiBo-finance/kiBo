'use client'

import { cn } from '../../lib/utils'
import {
  DialogTrigger as AriaDialogTrigger,
  Modal,
  ModalOverlay,
  Dialog as AriaDialog,
  Heading,
  composeRenderProps,
  type ModalOverlayProps,
} from 'react-aria-components'
import { X } from 'lucide-react'
import * as React from 'react'

// Create a context for the onOpenChange callback
const DialogStateContext = React.createContext<(() => void) | null>(null)

// Dialog root - wrapper for DialogTrigger
interface DialogProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function Dialog({ children, open, onOpenChange }: DialogProps) {
  const closeDialog = React.useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  return (
    <DialogStateContext.Provider value={closeDialog}>
      <AriaDialogTrigger isOpen={open} onOpenChange={onOpenChange}>
        {children}
      </AriaDialogTrigger>
    </DialogStateContext.Provider>
  )
}

// DialogTrigger - just a slot that accepts a button
interface DialogTriggerProps {
  children?: React.ReactNode
  asChild?: boolean
}

function DialogTrigger({ children }: DialogTriggerProps) {
  return <>{children}</>
}

// DialogPortal - no-op in React Aria (Modal handles portaling)
interface DialogPortalProps {
  children?: React.ReactNode
}

function DialogPortal({ children }: DialogPortalProps) {
  return <>{children}</>
}

// DialogClose - close button context
const DialogCloseContext = React.createContext<(() => void) | null>(null)

interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

function DialogClose({ children, className, ...props }: DialogCloseProps) {
  const close = React.useContext(DialogCloseContext)
  return (
    <button
      type="button"
      onClick={close ?? undefined}
      className={cn(
        'absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      {children || (
        <>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </>
      )}
    </button>
  )
}

// DialogOverlay
interface DialogOverlayProps extends Omit<ModalOverlayProps, 'className'> {
  className?: string
}

function DialogOverlay({ className, ...props }: DialogOverlayProps) {
  return (
    <ModalOverlay
      className={composeRenderProps(className, (className) =>
        cn(
          'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm dark:bg-black/90',
          className
        )
      )}
      {...props}
    />
  )
}

// DialogContent - internal component that has access to dialog state
function DialogContentInner({
  className,
  children,
  onClose,
}: {
  className?: string
  children?: React.ReactNode
  onClose?: () => void
}) {
  return (
    <AriaDialog className="outline-none">
      <DialogCloseContext.Provider value={onClose ?? null}>
        {children}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </DialogCloseContext.Provider>
    </AriaDialog>
  )
}

// DialogContent
interface DialogContentProps {
  className?: string
  children?: React.ReactNode
}

function DialogContent({ className, children }: DialogContentProps) {
  const closeFromContext = React.useContext(DialogStateContext)

  return (
    <ModalOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm dark:bg-black/90">
      <Modal
        className={composeRenderProps(className, (className) =>
          cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg sm:rounded-lg dark:bg-gray-900 dark:border-gray-700 dark:shadow-2xl',
            className
          )
        )}
      >
        <DialogContentInner className={className} onClose={closeFromContext ?? undefined}>
          {children}
        </DialogContentInner>
      </Modal>
    </ModalOverlay>
  )
}

// DialogHeader
interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}

// DialogFooter
interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  )
}

// DialogTitle
interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

function DialogTitle({ className, children, ...props }: DialogTitleProps) {
  return (
    <Heading
      slot="title"
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-foreground dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </Heading>
  )
}

// DialogDescription
interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return <p className={cn('text-sm text-muted-foreground dark:text-gray-300', className)} {...props} />
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
