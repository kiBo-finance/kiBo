import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateCurrencySchema = z.object({
  symbol: z.string().min(1).max(10).optional(),
  name: z.string().min(1).max(100).optional(),
  decimals: z.number().int().min(0).max(8).optional(),
  isActive: z.boolean().optional()
})

/**
 * GET /api/currencies/[code]
 * 特定の通貨情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await params

    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() }
    })
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(currency)
  } catch (error) {
    console.error('Failed to fetch currency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/currencies/[code]
 * 通貨情報を更新（管理者権限が必要）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await params

    // TODO: 管理者権限チェックを実装
    // if (!session.user.isAdmin) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() }
    })
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateCurrencySchema.parse(body)
    
    const updatedCurrency = await prisma.currency.update({
      where: { code: code.toUpperCase() },
      data: validatedData
    })
    
    return NextResponse.json(updatedCurrency)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Failed to update currency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/currencies/[code]
 * 通貨を削除（管理者権限が必要）
 * 注意: 使用中の通貨は削除できない
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await params

    // TODO: 管理者権限チェックを実装
    // if (!session.user.isAdmin) {
    //   return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    // }

    const currency = await prisma.currency.findUnique({
      where: { code: code.toUpperCase() }
    })
    
    if (!currency) {
      return NextResponse.json(
        { error: 'Currency not found' },
        { status: 404 }
      )
    }

    // 使用中の通貨かチェック
    const usageCount = await prisma.$transaction([
      prisma.appAccount.count({ where: { currency: code.toUpperCase() } }),
      prisma.transaction.count({ where: { currency: code.toUpperCase() } }),
      prisma.scheduledTransaction.count({ where: { currency: code.toUpperCase() } })
    ])

    const totalUsage = usageCount.reduce((sum, count) => sum + count, 0)
    
    if (totalUsage > 0) {
      return NextResponse.json(
        { error: 'Cannot delete currency: it is currently in use' },
        { status: 409 }
      )
    }
    
    await prisma.currency.delete({
      where: { code: code.toUpperCase() }
    })
    
    return NextResponse.json({ message: 'Currency deleted successfully' })
  } catch (error) {
    console.error('Failed to delete currency:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}