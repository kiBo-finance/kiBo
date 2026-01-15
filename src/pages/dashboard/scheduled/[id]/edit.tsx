import { ScheduledEditClient } from '../../../../components/ScheduledEditClient'

export default function ScheduledEditPage({ id }: { id: string }) {
  return <ScheduledEditClient id={id} />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
