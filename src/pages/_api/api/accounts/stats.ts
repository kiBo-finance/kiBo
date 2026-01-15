import { auth } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'
import type { SessionUser } from '../../../../lib/types/auth'
import { Decimal } from 'decimal.js'

/**
 * GET /api/accounts/stats
 * ユーザーの口座統計情報を取得
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const baseCurrency = searchParams.get('baseCurrency') || 'JPY'

    const user = session.user as SessionUser

    // 基本統計情報を取得
    const [accounts, cards, totalsByType, totalsByCurrency, fixedDeposits] = await Promise.all([
      // アクティブな口座数
      prisma.appAccount.count({
        where: { userId: user.id, isActive: true },
      }),

      // アクティブなカード数
      prisma.card.count({
        where: { userId: user.id, isActive: true },
      }),

      // タイプ別残高合計
      prisma.appAccount.groupBy({
        by: ['type'],
        where: { userId: user.id, isActive: true },
        _sum: { balance: true },
        _count: { id: true },
      }),

      // 通貨別残高合計
      prisma.appAccount.groupBy({
        by: ['currency'],
        where: { userId: user.id, isActive: true },
        _sum: { balance: true },
        _count: { id: true },
        orderBy: { currency: 'asc' },
      }),

      // 定期預金情報
      prisma.appAccount.findMany({
        where: {
          userId: user.id,
          isActive: true,
          type: 'FIXED_DEPOSIT',
        },
        select: {
          id: true,
          name: true,
          balance: true,
          currency: true,
          fixedDepositRate: true,
          fixedDepositMaturity: true,
          currencyRef: {
            select: { symbol: true },
          },
        },
      }),
    ])

    // 為替レート取得（基準通貨変換用）
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        OR: [{ toCurrency: baseCurrency }, { fromCurrency: baseCurrency }],
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['fromCurrency', 'toCurrency'],
    })

    // 為替レートマップ作成
    const rateMap = new Map<string, Decimal>()
    exchangeRates.forEach((rate) => {
      rateMap.set(`${rate.fromCurrency}-${rate.toCurrency}`, rate.rate)
      // 逆レートも計算
      rateMap.set(`${rate.toCurrency}-${rate.fromCurrency}`, new Decimal(1).div(rate.rate))
    })

    // 基準通貨への変換関数
    const convertToBase = (amount: Decimal, currency: string): Decimal => {
      if (currency === baseCurrency) return amount

      const rate = rateMap.get(`${currency}-${baseCurrency}`)
      return rate ? amount.mul(rate) : amount
    }

    // 総資産計算
    let totalAssets = new Decimal(0)
    totalsByCurrency.forEach((item) => {
      if (item._sum.balance) {
        totalAssets = totalAssets.plus(convertToBase(item._sum.balance, item.currency))
      }
    })

    // タイプ別統計（基準通貨換算）
    const assetsByType = totalsByType.map((item) => ({
      type: item.type,
      count: item._count.id,
      totalAmount: item._sum.balance || new Decimal(0),
      // 通貨別詳細は省略（必要に応じて追加）
    }))

    // 通貨別統計
    const assetsByCurrency = totalsByCurrency.map((item) => ({
      currency: item.currency,
      count: item._count.id,
      totalAmount: item._sum.balance || new Decimal(0),
      totalAmountInBase: item._sum.balance
        ? convertToBase(item._sum.balance, item.currency)
        : new Decimal(0),
    }))

    // まもなく満期の定期預金
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const upcomingMaturity = fixedDeposits.filter(
      (account) => account.fixedDepositMaturity && account.fixedDepositMaturity <= thirtyDaysLater
    )

    // 残高が少ない口座（閾値: 10,000円相当）
    const lowBalanceThreshold = new Decimal(10000)
    const lowBalanceAccounts = await prisma.appAccount.findMany({
      where: {
        userId: user.id,
        isActive: true,
        type: { not: 'FIXED_DEPOSIT' },
      },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        currency: true,
        currencyRef: {
          select: { symbol: true },
        },
      },
    })

    const lowBalance = lowBalanceAccounts.filter((account) => {
      const balanceInBase = convertToBase(account.balance, account.currency)
      return balanceInBase.lt(lowBalanceThreshold)
    })

    const stats = {
      summary: {
        totalAccounts: accounts,
        totalCards: cards,
        totalAssets: totalAssets.toNumber(),
        totalAssetsFormatted: totalAssets.toFixed(2),
        baseCurrency,
        uniqueCurrencies: totalsByCurrency.length,
      },
      assetsByType,
      assetsByCurrency,
      fixedDeposits: {
        total: fixedDeposits.length,
        totalAmount: fixedDeposits
          .reduce((sum, fd) => sum.plus(fd.balance), new Decimal(0))
          .toNumber(),
        upcomingMaturity: upcomingMaturity.length,
        upcomingMaturityList: upcomingMaturity.map((fd) => ({
          id: fd.id,
          name: fd.name,
          balance: fd.balance.toNumber(),
          currency: fd.currency,
          symbol: fd.currencyRef.symbol,
          maturityDate: fd.fixedDepositMaturity,
          rate: fd.fixedDepositRate?.toNumber(),
        })),
      },
      alerts: {
        lowBalance: lowBalance.length,
        lowBalanceList: lowBalance.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          balance: account.balance.toNumber(),
          currency: account.currency,
          symbol: account.currencyRef.symbol,
        })),
      },
    }

    return Response.json(stats)
  } catch (error) {
    console.error('Failed to fetch account stats:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
