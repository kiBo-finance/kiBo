import { LoginClient } from '@/components/LoginClient'

export default function LoginPage() {
  return <LoginClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
