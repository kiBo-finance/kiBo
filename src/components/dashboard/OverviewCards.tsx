'use client'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { totalAssetsAtom, accountsAtom, cardsAtom } from '../../lib/atoms/accounts'
import { transactionsAtom } from '../../lib/atoms/transactions'
import { useAtomValue } from 'jotai'
import { PiggyBank, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'

export function OverviewCards() {
  const totalAssets = useAtomValue(totalAssetsAtom)
  const accounts = useAtomValue(accountsAtom)
  const cards = useAtomValue(cardsAtom)
  const transactions = useAtomValue(transactionsAtom)

  // Calculate this month's income and expenses
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const thisMonthTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date)
    const tMonth = transactionDate.getMonth()
    const tYear = transactionDate.getFullYear()
    return tMonth === currentMonth && tYear === currentYear
  })

  const monthlyIncome = thisMonthTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0)

  const monthlyExpenses = thisMonthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">総資産</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAssets.format()}</div>
          <p className="text-xs text-muted-foreground">{accounts.length}個の口座</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今月の収入</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(monthlyIncome)}
          </div>
          <p className="text-xs text-muted-foreground">前月比 +12.5%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">今月の支出</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(monthlyExpenses)}
          </div>
          <p className="text-xs text-muted-foreground">前月比 -5.2%</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">カード枚数</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{cards.length}枚</div>
          <p className="text-xs text-muted-foreground">
            {cards.filter((c) => c.type === 'CREDIT').length}枚のクレジットカード
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
