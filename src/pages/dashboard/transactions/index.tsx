import { TransactionsClient } from '../../../components/TransactionsClient'

export default function TransactionsPage() {
  return <TransactionsClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
