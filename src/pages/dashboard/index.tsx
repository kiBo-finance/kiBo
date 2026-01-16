import { DashboardClient } from '@/components/DashboardClient'

export default function DashboardPage() {
  return <DashboardClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
