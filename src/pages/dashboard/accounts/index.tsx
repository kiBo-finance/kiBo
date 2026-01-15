import { AccountsClient } from '../../../components/AccountsClient'

export default function AccountsPage() {
  return <AccountsClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
