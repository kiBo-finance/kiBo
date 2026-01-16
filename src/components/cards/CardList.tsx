'use client'

import { CardDetailDialog } from './CardDetailDialog'
import { CardFormDialog } from './CardFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCards } from '@/lib/hooks/useCards'
import type { Card as PrismaCard, CardType } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'
import { Plus, CreditCard, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'

type CardWithAccount = PrismaCard & {
  account: {
    name: string
    currency: string
  }
}

const CARD_TYPE_LABELS = {
  CREDIT: 'クレジットカード',
  DEBIT: 'デビットカード',
  PREPAID: 'プリペイドカード',
  POSTPAY: 'ポストペイカード',
}

const CARD_TYPE_COLORS = {
  CREDIT: 'bg-blue-500',
  DEBIT: 'bg-green-500',
  PREPAID: 'bg-purple-500',
  POSTPAY: 'bg-orange-500',
}

export function CardList() {
  const { cards, refreshCards } = useCards()
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCard, setSelectedCard] = useState<CardWithAccount | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Load cards and set loading to false when done
  useEffect(() => {
    const loadCards = async () => {
      await refreshCards()
      setLoading(false)
    }
    loadCards()
  }, [])

  // Cards are automatically loaded by useCards hook

  const handleCardCreated = () => {
    refreshCards()
    setShowForm(false)
  }

  const handleCardClick = (card: CardWithAccount) => {
    setSelectedCard(card)
    setShowDetail(true)
  }

  const formatCardNumber = (lastFour: string) => {
    return `•••• •••• •••• ${lastFour}`
  }

  const formatCurrency = (amount: Decimal | number | string | null, currency: string) => {
    if (amount === null || amount === undefined) return null
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    })
    // Handle Decimal objects, numbers, and strings
    const numValue = typeof amount === 'object' && 'toNumber' in amount
      ? amount.toNumber()
      : typeof amount === 'string'
        ? parseFloat(amount)
        : amount
    return formatter.format(numValue)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            <CreditCard size={48} className="mb-4 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">カードがありません</h3>
            <p className="mb-4 text-center text-muted-foreground">
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
              className="cursor-pointer transition-shadow hover:shadow-lg"
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
                  {!card.isActive && <Badge variant="destructive">無効</Badge>}
                </div>
                <CardTitle className="text-lg">{card.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="font-mono text-lg">{formatCardNumber(card.lastFourDigits)}</div>

                {card.brand && (
                  <div className="text-sm uppercase text-muted-foreground">{card.brand}</div>
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

                <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
                  <span>{card.account.name}</span>
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

      <CardFormDialog open={showForm} onOpenChange={setShowForm} onSuccess={handleCardCreated} />

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
