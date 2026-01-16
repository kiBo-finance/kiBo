import { BudgetsClient } from '@/components/budgets/BudgetsClient'

export default function BudgetsPage() {
  return <BudgetsClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
