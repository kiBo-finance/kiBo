'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  activeAccountsAtom,
  accountsByCurrencyAtom,
  totalAssetsAtom,
  accountStatsAtom,
} from '@/lib/atoms/accounts'
import { baseCurrencyAtom } from '@/lib/atoms/currency'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/currency'
import { useAtomValue } from 'jotai'
import {
  CreditCard,
  Wallet,
  PiggyBank,
  Clock,
  Eye,
  EyeOff,
  Plus,
  Settings,
  Edit,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { useState } from 'react'

interface AccountsListProps {
  className?: string
  onAccountSelect?: (accountId: string) => void
  onCreateAccount?: () => void
  onEditAccount?: (accountId: string) => void
  onDeleteAccount?: (accountId: string) => void
  showBalances?: boolean
  compact?: boolean
  createTrigger?: React.ReactNode
}

const ACCOUNT_TYPE_LABELS = {
  CASH: '現金',
  CHECKING: '普通預金',
  SAVINGS: '貯蓄預金',
  FIXED_DEPOSIT: '定期預金',
} as const

const ACCOUNT_TYPE_ICONS = {
  CASH: Wallet,
  CHECKING: CreditCard,
  SAVINGS: PiggyBank,
  FIXED_DEPOSIT: Clock,
} as const

export function AccountsList({
  className,
  onAccountSelect,
  onCreateAccount,
  onEditAccount,
  onDeleteAccount,
  showBalances = true,
  compact = false,
  createTrigger,
}: AccountsListProps) {
  const [balancesVisible, setBalancesVisible] = useState(showBalances)
  const accounts = useAtomValue(activeAccountsAtom)
  const accountsByCurrency = useAtomValue(accountsByCurrencyAtom)
  const totalAssets = useAtomValue(totalAssetsAtom)
  const accountStats = useAtomValue(accountStatsAtom)
  const baseCurrency = useAtomValue(baseCurrencyAtom)

  const getAccountTypeIcon = (type: keyof typeof ACCOUNT_TYPE_ICONS) => {
    const IconComponent = ACCOUNT_TYPE_ICONS[type]
    return <IconComponent className="h-4 w-4" />
  }

  const formatAccountBalance = (balance: number, currency: string) => {
    if (!balancesVisible) return '***'
    return formatCurrency(balance, currency)
  }

  const isNearMaturity = (account: (typeof accounts)[0]) => {
    if (account.type !== 'FIXED_DEPOSIT' || !account.fixedDepositMaturity) return false

    const now = new Date()
    const maturity = new Date(account.fixedDepositMaturity)
    const daysUntilMaturity = Math.ceil(
      (maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    return daysUntilMaturity <= 30
  }

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium">口座一覧</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBalancesVisible(!balancesVisible)}
              className="h-6 w-6 p-0"
            >
              {balancesVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
            {onCreateAccount && (
              <Button variant="ghost" size="sm" onClick={onCreateAccount} className="h-6 w-6 p-0">
                <Plus className="h-3 w-3" />
              </Button>
            )}
            {createTrigger}
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">口座がありません</div>
        ) : (
          <div className="space-y-2">
            {accounts.slice(0, 5).map((account) => (
              <div
                key={account.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded border cursor-pointer hover:bg-muted/50',
                  onAccountSelect && 'cursor-pointer'
                )}
                onClick={() => onAccountSelect?.(account.id)}
              >
                <div className="flex items-center gap-2">
                  {getAccountTypeIcon(account.type)}
                  <span className="text-sm font-medium">{account.name}</span>
                  {isNearMaturity(account) && (
                    <Badge variant="secondary" className="text-xs">
                      満期近
                    </Badge>
                  )}
                </div>
                <div className="text-sm font-medium">
                  {formatAccountBalance(Number(account.balance), account.currency)}
                </div>
              </div>
            ))}

            {accounts.length > 5 && (
              <div className="text-center">
                <Button variant="ghost" size="sm" className="text-xs">
                  すべて表示 ({accounts.length - 5}件)
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            口座管理
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBalancesVisible(!balancesVisible)}
            >
              {balancesVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
            {onCreateAccount && (
              <Button onClick={onCreateAccount} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                新規作成
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 資産概要 */}
        <div className="mb-6 rounded-lg border bg-muted/50 p-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {balancesVisible ? totalAssets.format() : '***'}
              </div>
              <div className="text-sm text-muted-foreground">総資産</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{accountStats.totalAccounts}</div>
              <div className="text-sm text-muted-foreground">口座数</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{accountStats.currencies}</div>
              <div className="text-sm text-muted-foreground">通貨種類</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {accountStats.accountsByType.FIXED_DEPOSIT}
              </div>
              <div className="text-sm text-muted-foreground">定期預金</div>
            </div>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="py-12 text-center">
            <CreditCard className="mx-auto mb-4 h-16 w-16 opacity-20" />
            <h3 className="mb-2 text-lg font-medium">口座がありません</h3>
            <p className="mb-4 text-muted-foreground">最初の口座を作成して資産管理を始めましょう</p>
            {onCreateAccount && (
              <Button onClick={onCreateAccount}>
                <Plus className="mr-2 h-4 w-4" />
                口座を作成
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* 通貨別グループ表示 */}
            {Object.entries(accountsByCurrency).map(([currency, currencyAccounts]) => (
              <div key={currency}>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-medium">
                    {currencyAccounts[0]?.currencyRef?.symbol} {currency}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {currencyAccounts.length}件
                  </Badge>
                </div>

                <div className="grid gap-3">
                  {currencyAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={cn(
                        'p-4 rounded-lg border transition-colors',
                        onAccountSelect
                          ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/50'
                          : ''
                      )}
                      onClick={() => onAccountSelect?.(account.id)}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded bg-muted p-2">
                            {getAccountTypeIcon(account.type)}
                          </div>
                          <div>
                            <h4 className="font-medium">{account.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {ACCOUNT_TYPE_LABELS[account.type]}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-bold">
                            {formatAccountBalance(Number(account.balance), account.currency)}
                          </div>
                          {account.type === 'FIXED_DEPOSIT' && account.fixedDepositRate && (
                            <div className="text-sm text-muted-foreground">
                              年利 {Number(account.fixedDepositRate).toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 追加情報 */}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          {account.description && <span>{account.description}</span>}
                          {isNearMaturity(account) && (
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="mr-1 h-3 w-3" />
                              満期近
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span>
                            更新: {new Date(account.updatedAt).toLocaleDateString('ja-JP')}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEditAccount && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onEditAccount(account.id)
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  編集
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {onDeleteAccount && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onDeleteAccount(account.id)
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  削除
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
