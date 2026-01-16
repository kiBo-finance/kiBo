import { ReportsClient } from '@/components/reports/ReportsClient'

export default function ReportsPage() {
  return <ReportsClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
