import { CardList } from '@/components/cards/CardList'

export default function CardsPage() {
  return (
    <div className="container mx-auto p-6">
      <CardList />
    </div>
  )
}

export const metadata = {
  title: 'カード管理 | kiBoアプリ',
  description: 'クレジットカード、デビットカード、プリペイドカードを管理'
}