'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Card } from '@prisma/client'
import { Plus, Wallet, CreditCard } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link } from 'waku/router/client'
import { toast } from 'sonner'

interface CardWithAccount extends Card {
  account: {
    name: string
    currency: string
  }
}

interface ChargeDialogProps {
  card: CardWithAccount | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

interface Account {
  id: string
  name: string
  currency: string
  balance: string
}

interface PrepaidCard {
  id: string
  name: string
  lastFourDigits: string
  balance: string
  account: {
    currency: string
  }
}

type SourceType = 'account' | 'card'

export function ChargeDialog({ card, open, onOpenChange, onSuccess }: ChargeDialogProps) {
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [cards, setCards] = useState<PrepaidCard[]>([])
  const [formData, setFormData] = useState({
    amount: '',
    sourceId: '',
    sourceType: '' as SourceType | '',
  })

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true)
      // フォームをリセット
      setFormData({ amount: '', sourceId: '', sourceType: '' })

      try {
        // 口座とカードを並列で取得
        const [accountsRes, cardsRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/cards'),
        ])

        const accountsData = await accountsRes.json()
        const cardsData = await cardsRes.json()

        if (accountsData.success) {
          setAccounts(accountsData.data as Account[])
        }

        if (cardsData.success) {
          // 自分自身以外のプリペイドカードで残高があるもののみ
          const prepaidCards = (cardsData.data as PrepaidCard[]).filter(
            (c) =>
              c.id !== card?.id &&
              parseFloat(c.balance || '0') > 0
          )
          setCards(prepaidCards)
        }

        // デフォルトチャージ元口座が設定されていれば自動選択
        if (card?.defaultChargeAccountId && accountsData.success) {
          const defaultAccount = (accountsData.data as Account[]).find(
            (account) => account.id === card.defaultChargeAccountId
          )
          if (defaultAccount) {
            setFormData({
              amount: '',
              sourceId: `account:${card.defaultChargeAccountId}`,
              sourceType: 'account',
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setDataLoading(false)
      }
    }

    if (open && card) {
      fetchData()
    }
  }, [open, card?.id, card?.accountId, card?.defaultChargeAccountId])

  const handleSourceChange = (value: string) => {
    const [type, id] = value.split(':') as [SourceType, string]
    setFormData((prev) => ({
      ...prev,
      sourceId: value,
      sourceType: type,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!card || !formData.sourceId) return

    setLoading(true)

    try {
      const [sourceType, sourceId] = formData.sourceId.split(':') as [SourceType, string]

      const payload: { amount: number; fromAccountId?: string; fromCardId?: string } = {
        amount: parseFloat(formData.amount),
      }

      if (sourceType === 'account') {
        payload.fromAccountId = sourceId
      } else {
        payload.fromCardId = sourceId
      }

      const response = await fetch(`/api/cards/${card.id}/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        onSuccess()
        onOpenChange(false)
        setFormData({
          amount: '',
          sourceId: '',
          sourceType: '',
        })
      } else {
        toast.error(data.error || 'チャージに失敗しました')
      }
    } catch (error) {
      console.error('Charge failed:', error)
      toast.error('チャージに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string, currency: string) => {
    if (!amount) return ''
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency,
    })
    return formatter.format(parseFloat(amount))
  }

  // 選択されたソースの残高を取得
  const getSelectedSourceBalance = (): string | null => {
    if (!formData.sourceId) return null

    const [type, id] = formData.sourceId.split(':') as [SourceType, string]

    if (type === 'account') {
      const account = accounts.find((a) => a.id === id)
      return account?.balance || null
    } else {
      const sourceCard = cards.find((c) => c.id === id)
      return sourceCard?.balance || null
    }
  }

  const getSelectedSourceCurrency = (): string => {
    if (!formData.sourceId) return 'JPY'

    const [type, id] = formData.sourceId.split(':') as [SourceType, string]

    if (type === 'account') {
      const account = accounts.find((a) => a.id === id)
      return account?.currency || 'JPY'
    } else {
      const sourceCard = cards.find((c) => c.id === id)
      return sourceCard?.account?.currency || 'JPY'
    }
  }

  const selectedBalance = getSelectedSourceBalance()
  const selectedCurrency = getSelectedSourceCurrency()
  const currentBalance = card?.balance ? parseFloat(String(card.balance)) : 0
  const chargeAmount = parseFloat(formData.amount || '0')
  const newBalance = currentBalance + chargeAmount

  const hasNoSources = accounts.length === 0 && cards.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>プリペイドカードチャージ</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg bg-muted p-3">
            <div className="font-medium">{card?.name}</div>
            <div className="text-sm text-muted-foreground">
              •••• •••• •••• {card?.lastFourDigits}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              現在残高:{' '}
              {formatCurrency(String(card?.balance ?? '0'), card?.account?.currency || 'JPY')}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">チャージ元 *</Label>
            {dataLoading ? (
              <div className="flex h-10 items-center justify-center rounded-md border">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
              </div>
            ) : hasNoSources ? (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="space-y-2 text-sm text-yellow-800">
                  <p>
                    チャージ可能な口座またはカードがありません。
                  </p>
                  <Link
                    to={'/dashboard/accounts/new' as never}
                    className="inline-flex items-center gap-1 font-medium text-yellow-900 underline hover:no-underline"
                    onClick={() => onOpenChange(false)}
                  >
                    <Plus size={14} />
                    新しい口座を作成
                  </Link>
                </div>
              </div>
            ) : (
              <Select
                value={formData.sourceId}
                onValueChange={handleSourceChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="チャージ元を選択" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2">
                        <Wallet size={14} />
                        口座
                      </SelectLabel>
                      {accounts?.map((account) => (
                        <SelectItem
                          key={`account:${account.id}`}
                          value={`account:${account.id}`}
                          textValue={`${account.name} (${formatCurrency(account.balance, account.currency)})`}
                        >
                          {account.name} ({formatCurrency(account.balance, account.currency)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {cards.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-2">
                        <CreditCard size={14} />
                        プリペイドカード
                      </SelectLabel>
                      {cards?.map((c) => (
                        <SelectItem
                          key={`card:${c.id}`}
                          value={`card:${c.id}`}
                          textValue={`${c.name} •${c.lastFourDigits} (${formatCurrency(c.balance, c.account.currency)})`}
                        >
                          {c.name} •{c.lastFourDigits} ({formatCurrency(c.balance, c.account.currency)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            )}
            {selectedBalance && (
              <div className="text-sm text-muted-foreground">
                残高: {formatCurrency(selectedBalance, selectedCurrency)}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">チャージ金額 *</Label>
            <Input
              id="amount"
              type="number"
              step={(card?.account?.currency || 'JPY') === 'JPY' ? '1' : '0.01'}
              min={(card?.account?.currency || 'JPY') === 'JPY' ? '1' : '0.01'}
              max={selectedBalance || undefined}
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder={(card?.account?.currency || 'JPY') === 'JPY' ? '0' : '0.00'}
              required
            />
            {formData.amount && (
              <div className="text-sm text-muted-foreground">
                {formatCurrency(formData.amount, card?.account?.currency || 'JPY')}
              </div>
            )}
          </div>

          {formData.amount && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm text-blue-800">
                <strong>チャージ後残高</strong>
                <br />
                {formatCurrency(newBalance.toString(), card?.account?.currency || 'JPY')}
              </div>
            </div>
          )}

          {selectedBalance &&
            formData.amount &&
            parseFloat(formData.amount) > parseFloat(selectedBalance) && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-sm text-red-800">チャージ金額が残高を超えています</div>
              </div>
            )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                dataLoading ||
                hasNoSources ||
                !formData.amount ||
                !formData.sourceId ||
                (selectedBalance !== null &&
                  parseFloat(formData.amount) > parseFloat(selectedBalance))
              }
            >
              {loading ? 'チャージ中...' : 'チャージ実行'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
