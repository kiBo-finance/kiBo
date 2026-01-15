import { HomeClient } from '../components/HomeClient'

export default function HomePage() {
  return <HomeClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
