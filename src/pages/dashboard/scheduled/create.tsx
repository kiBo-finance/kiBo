import { ScheduledCreateClient } from '../../../components/ScheduledCreateClient'

export default function ScheduledCreatePage() {
  return <ScheduledCreateClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
