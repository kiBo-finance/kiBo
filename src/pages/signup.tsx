import { SignupClient } from '../components/SignupClient'

export default function SignupPage() {
  return <SignupClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
