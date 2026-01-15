import type { ReactNode } from 'react'
import { DashboardLayoutClient } from '../../components/DashboardLayoutClient'

type DashboardLayoutProps = { children: ReactNode }

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
