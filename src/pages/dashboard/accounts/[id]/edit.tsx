import { AccountEditClient } from '@/components/AccountEditClient'

export default function AccountEditPage({ id }: { id: string }) {
  return <AccountEditClient id={id} />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
