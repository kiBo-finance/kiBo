import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import { Decimal } from 'decimal.js'
import { z } from 'zod'

const createExchangeRateSchema = z.object({
  fromCurrency: z.string().length(3).toUpperCase(),
  toCurrency: z.string().length(3).toUpperCase(),
  rate: z.number().positive(),
  source: z.string().optional(),
})

/**
 * GET /api/exchange-rates
 * 為替レート一覧を取得
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
    const fromCurrency = searchParams.get('from')
    const toCurrency = searchParams.get('to')
    const latest = searchParams.get('latest') === 'true'

    const whereClause: Prisma.ExchangeRateWhereInput = {}

    if (fromCurrency) {
      whereClause.fromCurrency = fromCurrency.toUpperCase()
    }

    if (toCurrency) {
      whereClause.toCurrency = toCurrency.toUpperCase()
    }

    let exchangeRates

    if (latest) {
      // 最新の為替レートのみ取得
      exchangeRates = await prisma.exchangeRate.findMany({
        where: whereClause,
        orderBy: [{ fromCurrency: 'asc' }, { toCurrency: 'asc' }, { timestamp: 'desc' }],
        distinct: ['fromCurrency', 'toCurrency'],
        include: {
          fromCurrencyRef: {
            select: { name: true, symbol: true },
          },
          toCurrencyRef: {
            select: { name: true, symbol: true },
          },
        },
      })
    } else {
      // 履歴も含めて取得
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000)

      exchangeRates = await prisma.exchangeRate.findMany({
        where: whereClause,
        orderBy: [{ timestamp: 'desc' }, { fromCurrency: 'asc' }, { toCurrency: 'asc' }],
        take: limit,
        include: {
          fromCurrencyRef: {
            select: { name: true, symbol: true },
          },
          toCurrencyRef: {
            select: { name: true, symbol: true },
          },
        },
      })
    }

    return Response.json(exchangeRates)
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/exchange-rates
 * 新しい為替レートを追加
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 配列の場合は複数の為替レートを一括追加
    if (Array.isArray(body)) {
      const validatedRates = body.map((rate) => createExchangeRateSchema.parse(rate))

      // 同じ通貨ペア・同じ時刻は重複排除
      const uniqueRates = validatedRates.filter(
        (rate, index, arr) =>
          arr.findIndex(
            (r) => r.fromCurrency === rate.fromCurrency && r.toCurrency === rate.toCurrency
          ) === index
      )

      // 通貨が存在するかチェック
      const currencyCodes = Array.from(
        new Set([
          ...uniqueRates.map((r) => r.fromCurrency),
          ...uniqueRates.map((r) => r.toCurrency),
        ])
      )

      const existingCurrencies = await prisma.currency.findMany({
        where: { code: { in: currencyCodes } },
        select: { code: true },
      })

      const existingCodes = new Set(existingCurrencies.map((c) => c.code))
      const missingCodes = currencyCodes.filter((code) => !existingCodes.has(code))

      if (missingCodes.length > 0) {
        return Response.json(
          { error: 'Currency not found', missingCurrencies: missingCodes },
          { status: 400 }
        )
      }

      const exchangeRates = await prisma.exchangeRate.createMany({
        data: uniqueRates.map((rate) => ({
          ...rate,
          rate: new Decimal(rate.rate),
          timestamp: new Date(),
        })),
        skipDuplicates: true,
      })

      return Response.json(
        {
          message: `${exchangeRates.count} exchange rates created`,
          count: exchangeRates.count,
        },
        { status: 201 }
      )
    } else {
      // 単一の為替レート追加
      const validatedData = createExchangeRateSchema.parse(body)

      // 通貨が存在するかチェック
      const [fromCurrency, toCurrency] = await Promise.all([
        prisma.currency.findUnique({ where: { code: validatedData.fromCurrency } }),
        prisma.currency.findUnique({ where: { code: validatedData.toCurrency } }),
      ])

      if (!fromCurrency) {
        return Response.json(
          { error: `Currency ${validatedData.fromCurrency} not found` },
          { status: 400 }
        )
      }

      if (!toCurrency) {
        return Response.json(
          { error: `Currency ${validatedData.toCurrency} not found` },
          { status: 400 }
        )
      }

      const exchangeRate = await prisma.exchangeRate.create({
        data: {
          ...validatedData,
          rate: new Decimal(validatedData.rate),
          timestamp: new Date(),
        },
        include: {
          fromCurrencyRef: {
            select: { name: true, symbol: true },
          },
          toCurrencyRef: {
            select: { name: true, symbol: true },
          },
        },
      })

      return Response.json(exchangeRate, { status: 201 })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Failed to create exchange rate:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const getConfig = async () => {
  return {
    render: 'dynamic',
  } as const
}
