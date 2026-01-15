import { NotificationsSettingsClient } from '../../../components/NotificationsSettingsClient'

export default function NotificationsSettingsPage() {
  return <NotificationsSettingsClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
