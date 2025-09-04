'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CreditCard, ArrowUpDown, Settings, Zap } from 'lucide-react'
import { PaymentDialog } from './PaymentDialog'
import { ChargeDialog } from './ChargeDialog'

interface CardDetailDialogProps {
  card: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

const CARD_TYPE_LABELS = {
  CREDIT: 'クレジットカード',
  DEBIT: 'デビットカード',
  PREPAID: 'プリペイドカード',
  POSTPAY: 'ポストペイカード'
}

export function CardDetailDialog({ card, open, onOpenChange, onUpdate }: CardDetailDialogProps) {
  const [cardDetail, setCardDetail] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showCharge, setShowCharge] = useState(false)

  const fetchCardDetail = async () => {
    if (!card.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/cards/${card.id}`)
      const data = await response.json()
      
      if (data.success) {
        setCardDetail(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch card detail:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && card) {
      fetchCardDetail()
    }
  }, [open, card])

  const formatCurrency = (amount: string, currency: string) => {
    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: currency
    })
    return formatter.format(parseFloat(amount))
  }

  const formatCardNumber = (lastFour: string) => {
    return `•••• •••• •••• ${lastFour}`
  }

  if (loading || !cardDetail) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const canMakePayments = cardDetail.type !== 'PREPAID' || (cardDetail.balance && parseFloat(cardDetail.balance) > 0)
  const canCharge = cardDetail.type === 'PREPAID'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={20} />
              {cardDetail.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* カード基本情報 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        {CARD_TYPE_LABELS[cardDetail.type as keyof typeof CARD_TYPE_LABELS]}
                      </Badge>
                      {!cardDetail.isActive && (
                        <Badge variant="destructive">無効</Badge>
                      )}
                    </div>
                    <div className="font-mono text-xl mb-2">
                      {formatCardNumber(cardDetail.lastFourDigits)}
                    </div>
                    {cardDetail.brand && (
                      <div className="text-sm text-muted-foreground uppercase font-semibold">
                        {cardDetail.brand}
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {canMakePayments && (
                      <Button 
                        onClick={() => setShowPayment(true)}
                        className="gap-2"
                      >
                        <CreditCard size={16} />
                        支払い
                      </Button>
                    )}
                    {canCharge && (
                      <Button 
                        onClick={() => setShowCharge(true)}
                        variant="outline"
                        className="gap-2 block"
                      >
                        <Zap size={16} />
                        チャージ
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">概要</TabsTrigger>
                <TabsTrigger value="transactions">取引履歴</TabsTrigger>
                <TabsTrigger value="transfers">自動振替</TabsTrigger>
                <TabsTrigger value="settings">設定</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 残高・限度額情報 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">財務情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {cardDetail.balance && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">現在残高</span>
                          <span className="font-semibold text-green-600">
                            {formatCurrency(cardDetail.balance, cardDetail.account.currency)}
                          </span>
                        </div>
                      )}
                      
                      {cardDetail.creditLimit && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">利用限度額</span>
                          <span className="font-semibold">
                            {formatCurrency(cardDetail.creditLimit, cardDetail.account.currency)}
                          </span>
                        </div>
                      )}
                      
                      {cardDetail.monthlyLimit && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">月間限度額</span>
                          <span className="font-semibold">
                            {formatCurrency(cardDetail.monthlyLimit, cardDetail.account.currency)}
                          </span>
                        </div>
                      )}
                      
                      {cardDetail.monthlyUsage && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">今月の利用額</span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(cardDetail.monthlyUsage.toString(), cardDetail.account.currency)}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* 関連口座情報 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">関連口座</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">メイン口座</div>
                        <div className="font-medium">{cardDetail.account.name}</div>
                        <div className="text-xs text-muted-foreground">{cardDetail.account.currency}</div>
                      </div>
                      
                      {cardDetail.linkedAccount && (
                        <div>
                          <div className="text-sm text-muted-foreground">紐付け口座</div>
                          <div className="font-medium">{cardDetail.linkedAccount.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {cardDetail.linkedAccount.currency} • 自動振替用
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* カードタイプ別詳細情報 */}
                {cardDetail.type === 'CREDIT' && (cardDetail.billingDate || cardDetail.paymentDate) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">請求情報</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      {cardDetail.billingDate && (
                        <div>
                          <div className="text-sm text-muted-foreground">締め日</div>
                          <div className="font-medium">毎月{cardDetail.billingDate}日</div>
                        </div>
                      )}
                      {cardDetail.paymentDate && (
                        <div>
                          <div className="text-sm text-muted-foreground">支払日</div>
                          <div className="font-medium">毎月{cardDetail.paymentDate}日</div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {cardDetail.type === 'DEBIT' && cardDetail.autoTransferEnabled && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">自動振替設定</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          有効
                        </Badge>
                      </div>
                      {cardDetail.minBalance && (
                        <div className="text-sm text-muted-foreground">
                          最低維持残高: {formatCurrency(cardDetail.minBalance, cardDetail.account.currency)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">最近の取引</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cardDetail.transactions && cardDetail.transactions.length > 0 ? (
                      <div className="space-y-3">
                        {cardDetail.transactions.map((transaction: any) => (
                          <div key={transaction.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{transaction.description}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${transaction.type === 'EXPENSE' ? 'text-red-600' : 'text-green-600'}`}>
                                {transaction.type === 'EXPENSE' ? '-' : '+'}
                                {formatCurrency(transaction.amount.toString(), transaction.currency)}
                              </div>
                              <div className="text-xs text-muted-foreground">{transaction.type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        取引履歴がありません
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transfers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">自動振替履歴</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {cardDetail.autoTransfers && cardDetail.autoTransfers.length > 0 ? (
                      <div className="space-y-3">
                        {cardDetail.autoTransfers.map((transfer: any) => (
                          <div key={transfer.id} className="flex justify-between items-center p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{transfer.reason}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(transfer.executedAt).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-blue-600">
                                {formatCurrency(transfer.amount.toString(), transfer.currency)}
                              </div>
                              <Badge variant={transfer.status === 'COMPLETED' ? 'default' : 'destructive'}>
                                {transfer.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        自動振替履歴がありません
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">カード設定</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">カード名</div>
                        <div className="font-medium">{cardDetail.name}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">種別</div>
                        <div className="font-medium">{CARD_TYPE_LABELS[cardDetail.type as keyof typeof CARD_TYPE_LABELS]}</div>
                      </div>
                      {cardDetail.expiryDate && (
                        <div>
                          <div className="text-muted-foreground">有効期限</div>
                          <div className="font-medium">
                            {new Date(cardDetail.expiryDate).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="text-muted-foreground">ステータス</div>
                        <Badge variant={cardDetail.isActive ? 'default' : 'destructive'}>
                          {cardDetail.isActive ? '有効' : '無効'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <Button variant="outline" className="gap-2">
                        <Settings size={16} />
                        カード設定を編集
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        card={cardDetail}
        open={showPayment}
        onOpenChange={setShowPayment}
        onSuccess={() => {
          fetchCardDetail()
          onUpdate()
        }}
      />

      <ChargeDialog
        card={cardDetail}
        open={showCharge}
        onOpenChange={setShowCharge}
        onSuccess={() => {
          fetchCardDetail()
          onUpdate()
        }}
      />
    </>
  )
}