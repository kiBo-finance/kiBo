import { ScheduledClient } from '../../../components/ScheduledClient'

export default function ScheduledPage() {
  return <ScheduledClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
