import { ScheduledDetailClient } from '../../../components/ScheduledDetailClient'

export default function ScheduledDetailPage({ id }: { id: string }) {
  return <ScheduledDetailClient id={id} />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
