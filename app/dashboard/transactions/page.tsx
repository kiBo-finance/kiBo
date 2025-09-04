'use client'

import { useState, useEffect } from 'react'
import { useSetAtom, useAtomValue } from 'jotai'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransactionList } from '@/components/transactions/TransactionList'
import { ScheduledTransactionList } from '@/components/transactions/ScheduledTransactionList'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { TransactionStats } from '@/components/transactions/TransactionStats'
import { 
  PlusCircle, 
  Calendar, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle
} from 'lucide-react'
import { 
  transactionsAtom, 
  scheduledTransactionsAtom,
  totalIncomeAtom,
  totalExpenseAtom,
  netIncomeAtom,
  overdueScheduledTransactionsAtom,
  type Transaction,
  type ScheduledTransaction
} from '@/lib/atoms/transactions'
import { currenciesAtom } from '@/lib/atoms/currency'
import { accountsAtom } from '@/lib/atoms/accounts'
import Decimal from 'decimal.js'

export default function TransactionsPage() {
  const setTransactions = useSetAtom(transactionsAtom)
  const setScheduledTransactions = useSetAtom(scheduledTransactionsAtom)
  const setCurrencies = useSetAtom(currenciesAtom)
  const setAccounts = useSetAtom(accountsAtom)
  
  const totalIncome = useAtomValue(totalIncomeAtom)
  const totalExpense = useAtomValue(totalExpenseAtom)
  const netIncome = useAtomValue(netIncomeAtom)
  const overdueTransactions = useAtomValue(overdueScheduledTransactionsAtom)
  
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('transactions')
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showScheduledForm, setShowScheduledForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingScheduledTransaction, setEditingScheduledTransaction] = useState<ScheduledTransaction | null>(null)

  // データの読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        // 並列でデータを取得
        const [currenciesRes, accountsRes, transactionsRes, scheduledRes] = await Promise.all([
          fetch('/api/currencies'),
          fetch('/api/accounts'),
          fetch('/api/transactions'),
          fetch('/api/scheduled-transactions')
        ])

        if (currenciesRes.ok) {
          const currencies = await currenciesRes.json()
          setCurrencies(currencies.data)
        }

        if (accountsRes.ok) {
          const accounts = await accountsRes.json()
          setAccounts(accounts.data)
        }

        if (transactionsRes.ok) {
          const transactions = await transactionsRes.json()
          setTransactions(transactions.data)
        }

        if (scheduledRes.ok) {
          const scheduled = await scheduledRes.json()
          setScheduledTransactions(scheduled.data)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleEditScheduledTransaction = (transaction: ScheduledTransaction) => {
    setEditingScheduledTransaction(transaction)
    setShowScheduledForm(true)
  }

  const handleFormSuccess = () => {
    setShowTransactionForm(false)
    setShowScheduledForm(false)
    setEditingTransaction(null)
    setEditingScheduledTransaction(null)
  }

  const formatAmount = (amount: Decimal) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount.toNumber())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">取引管理</h2>
          <p className="text-muted-foreground">
            収入、支出、振替の記録と予定取引の管理
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowScheduledForm(true)}
            variant="outline"
            className="cursor-pointer"
          >
            <Calendar className="mr-2 h-4 w-4" />
            予定を追加
          </Button>
          <Button 
            onClick={() => setShowTransactionForm(true)}
            className="cursor-pointer"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            取引を追加
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の収入</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatAmount(totalIncome)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">今月の支出</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatAmount(totalExpense)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">収支</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome.isPositive() ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatAmount(netIncome)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">期限切れ</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overdueTransactions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              未処理の予定
            </p>
          </CardContent>
        </Card>
      </div>

      {/* メインコンテンツ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="transactions">取引履歴</TabsTrigger>
          <TabsTrigger value="scheduled">予定取引</TabsTrigger>
          <TabsTrigger value="analytics">分析</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <TransactionFilters />
          <TransactionList 
            onEdit={handleEditTransaction}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="scheduled" className="space-y-4">
          {overdueTransactions.length > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <CardHeader>
                <CardTitle className="text-red-600 dark:text-red-400">
                  期限切れの予定取引
                </CardTitle>
                <CardDescription>
                  以下の予定取引が期限を過ぎています。処理してください。
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduledTransactionList 
                  filterStatus="OVERDUE"
                  onEdit={handleEditScheduledTransaction}
                  compact={true}
                />
              </CardContent>
            </Card>
          )}
          
          <ScheduledTransactionList 
            onEdit={handleEditScheduledTransaction}
            showActions={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <TransactionStats />
        </TabsContent>
      </Tabs>

      {/* 取引フォームダイアログ */}
      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? '取引を編集' : '新しい取引'}
            </DialogTitle>
          </DialogHeader>
          <TransactionForm 
            editingId={editingTransaction?.id}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowTransactionForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 予定取引フォームダイアログ */}
      <Dialog open={showScheduledForm} onOpenChange={setShowScheduledForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScheduledTransaction ? '予定取引を編集' : '新しい予定取引'}
            </DialogTitle>
          </DialogHeader>
          {/* ScheduledTransactionForm コンポーネント（後で実装） */}
          <div className="p-4 text-center text-muted-foreground">
            予定取引フォームは実装中です
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}