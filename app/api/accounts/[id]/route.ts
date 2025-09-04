import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Decimal } from 'decimal.js'

const updateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  balance: z.number().optional(),
  isActive: z.boolean().optional(),
  fixedDepositRate: z.number().min(0).max(100).optional().nullable(),
  fixedDepositMaturity: z.string().datetime().optional().nullable()
})

/**
 * GET /api/accounts/[id]
 * 特定の口座情報を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = (session.user as any).id

    const account = await prisma.appAccount.findFirst({
      where: {
        id,
        userId
      },
      include: {
        currencyRef: {
          select: { name: true, symbol: true, decimals: true }
        },
        cards: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            type: true,
            lastFourDigits: true,
            creditLimit: true,
            expiryDate: true
          }
        },
        _count: {
          select: { 
            transactions: true,
            scheduledTx: true
          }
        }
      }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(account)
  } catch (error) {
    console.error('Failed to fetch account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/accounts/[id]
 * 口座情報を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const account = await prisma.appAccount.findFirst({
      where: {
        id,
        userId: (session.user as any).id
      }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = updateAccountSchema.parse(body)
    
    // 名前変更の場合は重複チェック
    if (validatedData.name && validatedData.name !== account.name) {
      const existingAccount = await prisma.appAccount.findFirst({
        where: {
          userId: (session.user as any).id,
          name: validatedData.name,
          isActive: true,
          id: { not: id }
        }
      })
      
      if (existingAccount) {
        return NextResponse.json(
          { error: 'Account with this name already exists' },
          { status: 409 }
        )
      }
    }
    
    // 定期預金以外で定期預金関連フィールドが設定されている場合はエラー
    if (account.type !== 'FIXED_DEPOSIT') {
      if (validatedData.fixedDepositRate !== undefined || validatedData.fixedDepositMaturity !== undefined) {
        return NextResponse.json(
          { error: 'Fixed deposit fields can only be set for FIXED_DEPOSIT type accounts' },
          { status: 400 }
        )
      }
    }
    
    const updateData: any = { ...validatedData }
    
    if (validatedData.balance !== undefined) {
      updateData.balance = new Decimal(validatedData.balance)
    }
    
    if (validatedData.fixedDepositRate !== undefined && validatedData.fixedDepositRate !== null) {
      updateData.fixedDepositRate = new Decimal(validatedData.fixedDepositRate)
    }
    
    if (validatedData.fixedDepositMaturity !== undefined && validatedData.fixedDepositMaturity !== null) {
      updateData.fixedDepositMaturity = new Date(validatedData.fixedDepositMaturity)
    }
    
    const updatedAccount = await prisma.appAccount.update({
      where: { id },
      data: updateData,
      include: {
        currencyRef: {
          select: { name: true, symbol: true, decimals: true }
        }
      }
    })
    
    return NextResponse.json(updatedAccount)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Failed to update account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/accounts/[id]
 * 口座を削除（論理削除）
 * 注意: 取引履歴がある口座は削除できない
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    })
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const account = await prisma.appAccount.findFirst({
      where: {
        id,
        userId: (session.user as any).id
      }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // 取引履歴や予定取引があるかチェック
    const usageCount = await prisma.$transaction([
      prisma.transaction.count({ where: { accountId: id } }),
      prisma.scheduledTransaction.count({ where: { accountId: id } }),
      prisma.card.count({ where: { accountId: id, isActive: true } })
    ])

    const totalUsage = usageCount.reduce((sum, count) => sum + count, 0)
    
    if (totalUsage > 0) {
      // 使用中の場合は非アクティブに変更
      await prisma.appAccount.update({
        where: { id },
        data: { isActive: false }
      })
      
      return NextResponse.json({ 
        message: 'Account deactivated (cannot delete account with existing transactions or cards)' 
      })
    } else {
      // 完全に削除
      await prisma.appAccount.delete({
        where: { id }
      })
      
      return NextResponse.json({ message: 'Account deleted successfully' })
    }
  } catch (error) {
    console.error('Failed to delete account:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}