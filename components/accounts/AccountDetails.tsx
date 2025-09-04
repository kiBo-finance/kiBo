'use client'

import { useState } from 'react'
import { useAtomValue } from 'jotai'
import { 
  CreditCard, Wallet, PiggyBank, Clock, Edit, Trash2, 
  TrendingUp, TrendingDown, Calendar, AlertTriangle,
  MoreHorizontal, Eye, EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { accountsAtom } from '@/lib/atoms/accounts'
import { formatCurrency, createCurrencyAmount } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface AccountDetailsProps {
  accountId: string
  className?: string
  onEdit?: (accountId: string) => void
  onDelete?: (accountId: string) => void
  showTransactions?: boolean
}

const ACCOUNT_TYPE_LABELS = {
  CASH: '現金',
  CHECKING: '普通預金',
  SAVINGS: '貯蓄預金',
  FIXED_DEPOSIT: '定期預金'
} as const

const ACCOUNT_TYPE_ICONS = {
  CASH: Wallet,
  CHECKING: CreditCard,
  SAVINGS: PiggyBank,
  FIXED_DEPOSIT: Clock
} as const

export function AccountDetails({
  accountId,
  className,
  onEdit,
  onDelete,
  showTransactions = false
}: AccountDetailsProps) {
  const [balanceVisible, setBalanceVisible] = useState(true)
  const accounts = useAtomValue(accountsAtom)
  
  const account = accounts.find(acc => acc.id === accountId)
  
  if (!account) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">口座が見つかりません</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  const IconComponent = ACCOUNT_TYPE_ICONS[account.type]
  const balance = createCurrencyAmount(account.balance, account.currency)
  
  // 定期預金の満期情報
  const isFixedDeposit = account.type === 'FIXED_DEPOSIT'
  const maturityDate = account.fixedDepositMaturity ? new Date(account.fixedDepositMaturity) : null
  const daysUntilMaturity = maturityDate 
    ? Math.ceil((maturityDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const isNearMaturity = daysUntilMaturity !== null && daysUntilMaturity <= 30
  const isMatured = daysUntilMaturity !== null && daysUntilMaturity <= 0
  
  // 利息計算（定期預金の場合）
  const estimatedInterest = isFixedDeposit && account.fixedDepositRate
    ? balance.multiply(Number(account.fixedDepositRate) / 100)
    : null
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg bg-muted">
              <IconComponent className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl">{account.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {ACCOUNT_TYPE_LABELS[account.type]}
                </Badge>
                <Badge variant="outline">
                  {account.currencyRef.symbol} {account.currency}
                </Badge>
                {isNearMaturity && !isMatured && (
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    満期近
                  </Badge>
                )}
                {isMatured && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    満期
                  </Badge>
                )}
                {!account.isActive && (
                  <Badge variant="secondary">非アクティブ</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBalanceVisible(!balanceVisible)}
            >
              {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(account.id)}>
                    <Edit className="h-4 w-4 mr-2" />
                    編集
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onDelete && (
                  <DropdownMenuItem 
                    onClick={() => onDelete(account.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    削除
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 残高表示 */}
        <div className="p-4 rounded-lg border bg-muted/50 dark:bg-gray-800/50 dark:border-gray-600">
          <div className="text-sm text-muted-foreground mb-1">現在残高</div>
          <div className="text-3xl font-bold">
            {balanceVisible ? balance.format() : '***'}
          </div>
          {account.description && (
            <div className="text-sm text-muted-foreground mt-2">
              {account.description}
            </div>
          )}
        </div>
        
        {/* 定期預金詳細情報 */}
        {isFixedDeposit && (
          <div className="grid gap-4">
            <div className="grid md:grid-cols-2 gap-4">
              {account.fixedDepositRate && (
                <div className="p-3 rounded border">
                  <div className="text-sm text-muted-foreground">年利率</div>
                  <div className="text-lg font-semibold">
                    {Number(account.fixedDepositRate).toFixed(2)}%
                  </div>
                </div>
              )}
              
              {maturityDate && (
                <div className="p-3 rounded border">
                  <div className="text-sm text-muted-foreground">満期日</div>
                  <div className="text-lg font-semibold">
                    {maturityDate.toLocaleDateString('ja-JP')}
                  </div>
                  {daysUntilMaturity !== null && (
                    <div className={cn(
                      "text-sm",
                      isMatured ? "text-red-600 dark:text-red-400" : 
                      isNearMaturity ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground"
                    )}>
                      {isMatured 
                        ? '満期到来' 
                        : `あと${daysUntilMaturity}日`}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {estimatedInterest && balanceVisible && (
              <div className="p-3 rounded border">
                <div className="text-sm text-muted-foreground">年間予想利息</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                  {estimatedInterest.format()}
                </div>
              </div>
            )}
            
            {isMatured && (
              <div className="p-3 rounded border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/50">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">満期のお知らせ</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  この定期預金は満期を迎えています。継続または解約の手続きを行ってください。
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* 口座統計情報 */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-3 rounded border">
            <div className="text-sm text-muted-foreground">作成日</div>
            <div className="font-medium">
              {new Date(account.createdAt).toLocaleDateString('ja-JP')}
            </div>
          </div>
          
          <div className="p-3 rounded border">
            <div className="text-sm text-muted-foreground">最終更新</div>
            <div className="font-medium">
              {new Date(account.updatedAt).toLocaleDateString('ja-JP')}
            </div>
          </div>
          
          <div className="p-3 rounded border">
            <div className="text-sm text-muted-foreground">ステータス</div>
            <div className="font-medium">
              {account.isActive ? '有効' : '無効'}
            </div>
          </div>
        </div>
        
        {/* 関連カード情報（TODO: カードが実装されたら） */}
        {/* {account.cards && account.cards.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">関連カード</h3>
            <div className="space-y-2">
              {account.cards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-2 rounded border">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{card.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {card.type}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ****{card.lastFourDigits}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )} */}
        
        {/* 取引履歴（TODO: 取引が実装されたら） */}
        {showTransactions && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">最近の取引</h3>
              <Button variant="ghost" size="sm">
                すべて表示
              </Button>
            </div>
            <div className="text-center py-8 text-muted-foreground">
              取引履歴はまだありません
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}