import { ScheduledCalendarClient } from '@/components/ScheduledCalendarClient'

export default function ScheduledCalendarPage() {
  return <ScheduledCalendarClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
