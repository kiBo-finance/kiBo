import { CardsClient } from '@/components/CardsClient'

export default function CardsPage() {
  return <CardsClient />
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
