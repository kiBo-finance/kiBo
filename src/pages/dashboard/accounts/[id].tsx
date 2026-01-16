import { AccountDetailClient } from '@/components/AccountDetailClient'

export default function AccountDetailPage({ id }: { id: string }) {
  return <AccountDetailClient id={id} />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
