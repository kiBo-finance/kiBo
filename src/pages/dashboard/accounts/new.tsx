import { AccountsNewClient } from '@/components/AccountsNewClient'

export default function AccountsNewPage() {
  return <AccountsNewClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
