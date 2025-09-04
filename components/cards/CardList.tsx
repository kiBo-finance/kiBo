'use client'

import { useState, useEffect } from 'react'
import { useCards } from '@/lib/hooks/useCards'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, CreditCard, Settings } from 'lucide-react'
import { CardFormDialog } from './CardFormDialog'
import { CardDetailDialog } from './CardDetailDialog'

interface CardData {
  id: string
  name: string
  type: 'CREDIT' | 'DEBIT' | 'PREPAID' | 'POSTPAY'
  brand?: string
  lastFourDigits: string
  balance?: string
  creditLimit?: string
  monthlyLimit?: string
  expiryDate?: string
  isActive: boolean
  account: {
    id: string
    name: string
    currency: string
  }
  linkedAccount?: {
    id: string
    name: string
    currency: string
  }
  _count: {
    transactions: number
  }
}

const CARD_TYPE_LABELS = {
  CREDIT: 'クレジットカード',
  DEBIT: 'デビットカード',
  PREPAID: 'プリペイドカード',
  POSTPAY: 'ポストペイカード'
}

const CARD_TYPE_COLORS = {
  CREDIT: 'bg-blue-500',
  DEBIT: 'bg-green-500',
  PREPAID: 'bg-purple-500',
  POSTPAY: 'bg-orange-500'
}

export function CardList() {
  const { cards, refreshCards } = useCards()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Set loading to false once cards are available
  useEffect(() => {
    if (cards.length > 0) {
      setLoading(false)
    }
  }, [cards])

  // Cards are automatically loaded by useCards hook

  const handleCardCreated = () => {
    refreshCards()
    setShowForm(false)
  }

  const handleCardClick = (card: CardData) => {
    setSelectedCard(card)
    setShowDetail(true)
  }

  const formatCardNumber = (lastFour: string) => {
    return `•••• •••• •••• ${lastFour}`
  }

  const formatCurrency = (amount: string, currency: string) => {
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency
    })
    return formatter.format(parseFloat(amount))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">カード管理</h1>
          <p className="text-muted-foreground">
            クレジットカード、デビットカード、プリペイドカードを管理
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={16} />
          カード追加
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard size={48} className="text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">カードがありません</h3>
            <p className="text-muted-foreground text-center mb-4">
              最初のカードを追加して、支払いを管理しましょう
            </p>
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus size={16} />
              カード追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card 
              key={card.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick(card)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="secondary"
                    className={`${CARD_TYPE_COLORS[card.type]} text-white`}
                  >
                    {CARD_TYPE_LABELS[card.type]}
                  </Badge>
                  {!card.isActive && (
                    <Badge variant="destructive">無効</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{card.name}</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="font-mono text-lg">
                  {formatCardNumber(card.lastFourDigits)}
                </div>
                
                {card.brand && (
                  <div className="text-sm text-muted-foreground uppercase">
                    {card.brand}
                  </div>
                )}

                {card.balance && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">残高</div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(card.balance, card.account.currency)}
                    </div>
                  </div>
                )}

                {card.creditLimit && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">利用限度額</div>
                    <div className="font-semibold">
                      {formatCurrency(card.creditLimit, card.account.currency)}
                    </div>
                  </div>
                )}

                {card.monthlyLimit && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">月間限度額</div>
                    <div className="font-semibold">
                      {formatCurrency(card.monthlyLimit, card.account.currency)}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
                  <span>{card.account.name}</span>
                  <span>{card._count.transactions}件の取引</span>
                </div>

                {card.expiryDate && (
                  <div className="text-xs text-muted-foreground">
                    有効期限: {new Date(card.expiryDate).toLocaleDateString('ja-JP')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CardFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={handleCardCreated}
      />

      {selectedCard && (
        <CardDetailDialog
          card={selectedCard}
          open={showDetail}
          onOpenChange={setShowDetail}
          onUpdate={refreshCards}
        />
      )}
    </div>
  )
}