import { prisma } from '@/lib/db'
import { Decimal } from 'decimal.js'
import { CardType } from '@prisma/client'

export interface CreateCardInput {
  name: string
  type: CardType
  brand?: string
  lastFourDigits: string
  accountId: string
  creditLimit?: number
  billingDate?: number
  paymentDate?: number
  balance?: number
  linkedAccountId?: string
  autoTransferEnabled?: boolean
  minBalance?: number
  monthlyLimit?: number
  settlementDay?: number
  expiryDate?: Date
}

export interface UpdateCardInput {
  name?: string
  brand?: string
  creditLimit?: number
  billingDate?: number
  paymentDate?: number
  balance?: number
  linkedAccountId?: string
  autoTransferEnabled?: boolean
  minBalance?: number
  monthlyLimit?: number
  settlementDay?: number
  expiryDate?: Date
  isActive?: boolean
}

export class CardService {
  /**
   * カードを作成
   */
  static async createCard(userId: string, input: CreateCardInput) {
    // 口座の存在確認
    const account = await prisma.appAccount.findFirst({
      where: {
        id: input.accountId,
        userId
      }
    })

    if (!account) {
      throw new Error('Account not found')
    }

    // デビットカードの場合、紐付け口座の確認
    if (input.type === 'DEBIT' && input.linkedAccountId) {
      const linkedAccount = await prisma.appAccount.findFirst({
        where: {
          id: input.linkedAccountId,
          userId
        }
      })

      if (!linkedAccount) {
        throw new Error('Linked account not found')
      }
    }

    // カード作成
    const card = await prisma.card.create({
      data: {
        name: input.name,
        type: input.type,
        brand: input.brand,
        lastFourDigits: input.lastFourDigits,
        accountId: input.accountId,
        userId,
        creditLimit: input.creditLimit ? new Decimal(input.creditLimit) : undefined,
        billingDate: input.billingDate,
        paymentDate: input.paymentDate,
        balance: input.balance ? new Decimal(input.balance) : undefined,
        linkedAccountId: input.linkedAccountId,
        autoTransferEnabled: input.autoTransferEnabled || false,
        minBalance: input.minBalance ? new Decimal(input.minBalance) : undefined,
        monthlyLimit: input.monthlyLimit ? new Decimal(input.monthlyLimit) : undefined,
        settlementDay: input.settlementDay,
        expiryDate: input.expiryDate
      },
      include: {
        account: true,
        linkedAccount: true
      }
    })

    return card
  }

  /**
   * カード情報を更新
   */
  static async updateCard(userId: string, cardId: string, input: UpdateCardInput) {
    const existingCard = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId
      }
    })

    if (!existingCard) {
      throw new Error('Card not found')
    }

    // デビットカードの場合、紐付け口座の確認
    if (existingCard.type === 'DEBIT' && input.linkedAccountId) {
      const linkedAccount = await prisma.appAccount.findFirst({
        where: {
          id: input.linkedAccountId,
          userId
        }
      })

      if (!linkedAccount) {
        throw new Error('Linked account not found')
      }
    }

    const updateData: any = {
      ...input,
      creditLimit: input.creditLimit !== undefined ? new Decimal(input.creditLimit) : undefined,
      balance: input.balance !== undefined ? new Decimal(input.balance) : undefined,
      minBalance: input.minBalance !== undefined ? new Decimal(input.minBalance) : undefined,
      monthlyLimit: input.monthlyLimit !== undefined ? new Decimal(input.monthlyLimit) : undefined
    }

    // undefined値を削除
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    const card = await prisma.card.update({
      where: { id: cardId },
      data: updateData,
      include: {
        account: true,
        linkedAccount: true
      }
    })

    return card
  }

  /**
   * デビットカード自動振替実行
   */
  static async executeAutoTransfer(
    cardId: string,
    requiredAmount: Decimal,
    currency: string
  ) {
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        account: true,
        linkedAccount: true
      }
    })

    if (!card || card.type !== 'DEBIT') {
      throw new Error('Invalid debit card')
    }

    if (!card.autoTransferEnabled || !card.linkedAccountId || !card.linkedAccount) {
      throw new Error('Auto transfer not enabled')
    }

    // 現在の残高を確認
    const currentBalance = card.balance || new Decimal(0)
    const minBalance = card.minBalance || new Decimal(0)
    
    // 必要な振替額を計算
    const transferAmount = requiredAmount.minus(currentBalance).plus(minBalance)
    
    if (transferAmount.lessThanOrEqualTo(0)) {
      return null // 振替不要
    }

    // 紐付け口座の残高確認
    if (card.linkedAccount.balance.lessThan(transferAmount)) {
      throw new Error('Insufficient balance in linked account')
    }

    // トランザクションで振替実行
    const result = await prisma.$transaction(async (tx) => {
      // 紐付け口座から引き落とし
      await tx.appAccount.update({
        where: { id: card.linkedAccountId! },
        data: {
          balance: {
            decrement: transferAmount
          }
        }
      })

      // カード口座に入金
      await tx.appAccount.update({
        where: { id: card.accountId },
        data: {
          balance: {
            increment: transferAmount
          }
        }
      })

      // カード残高更新
      await tx.card.update({
        where: { id: cardId },
        data: {
          balance: currentBalance.plus(transferAmount)
        }
      })

      // 振替記録作成
      const autoTransfer = await tx.autoTransfer.create({
        data: {
          cardId,
          fromAccountId: card.linkedAccountId!,
          toAccountId: card.accountId,
          amount: transferAmount,
          currency,
          reason: `デビットカード自動振替: ${card.name}`,
          status: 'COMPLETED',
          userId: card.userId
        }
      })

      // 取引記録作成（出金）
      await tx.transaction.create({
        data: {
          amount: transferAmount,
          currency,
          type: 'TRANSFER',
          description: `自動振替（出金）: ${card.linkedAccount!.name} → ${card.name}`,
          date: new Date(),
          accountId: card.linkedAccountId!,
          userId: card.userId,
          notes: `Auto Transfer ID: ${autoTransfer.id}`
        }
      })

      // 取引記録作成（入金）
      await tx.transaction.create({
        data: {
          amount: transferAmount,
          currency,
          type: 'TRANSFER',
          description: `自動振替（入金）: ${card.linkedAccount!.name} → ${card.name}`,
          date: new Date(),
          accountId: card.accountId,
          userId: card.userId,
          notes: `Auto Transfer ID: ${autoTransfer.id}`
        }
      })

      return autoTransfer
    })

    return result
  }

  /**
   * プリペイドカードのチャージ
   */
  static async chargePrepaidCard(
    userId: string,
    cardId: string,
    amount: number,
    fromAccountId: string
  ) {
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId,
        type: 'PREPAID'
      }
    })

    if (!card) {
      throw new Error('Prepaid card not found')
    }

    const fromAccount = await prisma.appAccount.findFirst({
      where: {
        id: fromAccountId,
        userId
      }
    })

    if (!fromAccount) {
      throw new Error('Source account not found')
    }

    const chargeAmount = new Decimal(amount)

    if (fromAccount.balance.lessThan(chargeAmount)) {
      throw new Error('Insufficient balance in source account')
    }

    const result = await prisma.$transaction(async (tx) => {
      // 口座から引き落とし
      await tx.appAccount.update({
        where: { id: fromAccountId },
        data: {
          balance: {
            decrement: chargeAmount
          }
        }
      })

      // カード残高更新
      const currentBalance = card.balance || new Decimal(0)
      await tx.card.update({
        where: { id: cardId },
        data: {
          balance: currentBalance.plus(chargeAmount)
        }
      })

      // 取引記録作成
      await tx.transaction.create({
        data: {
          amount: chargeAmount,
          currency: fromAccount.currency,
          type: 'TRANSFER',
          description: `プリペイドカードチャージ: ${card.name}`,
          date: new Date(),
          accountId: fromAccountId,
          userId
        }
      })

      return true
    })

    return result
  }

  /**
   * カード利用（支払い）処理
   */
  static async processCardPayment(
    userId: string,
    cardId: string,
    amount: number,
    currency: string,
    description: string,
    categoryId?: string
  ) {
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId,
        isActive: true
      },
      include: {
        account: true
      }
    })

    if (!card) {
      throw new Error('Card not found or inactive')
    }

    const paymentAmount = new Decimal(amount)

    // カードタイプ別の処理
    switch (card.type) {
      case 'CREDIT':
        // クレジットカード: 利用限度額チェック
        if (card.creditLimit) {
          // 現在の利用額を計算
          const currentMonth = new Date()
          currentMonth.setDate(1)
          currentMonth.setHours(0, 0, 0, 0)

          const monthlyUsage = await prisma.transaction.aggregate({
            where: {
              cardId,
              date: {
                gte: currentMonth
              },
              type: 'EXPENSE'
            },
            _sum: {
              amount: true
            }
          })

          const currentUsage = monthlyUsage._sum.amount || new Decimal(0)
          if (currentUsage.plus(paymentAmount).greaterThan(card.creditLimit)) {
            throw new Error('Credit limit exceeded')
          }
        }
        break

      case 'DEBIT':
        // デビットカード: 残高チェックと自動振替
        const debitBalance = card.balance || new Decimal(0)
        if (debitBalance.lessThan(paymentAmount)) {
          if (card.autoTransferEnabled) {
            // 自動振替実行
            await this.executeAutoTransfer(cardId, paymentAmount, currency)
          } else {
            throw new Error('Insufficient balance')
          }
        }
        break

      case 'PREPAID':
        // プリペイドカード: 残高チェック
        const prepaidBalance = card.balance || new Decimal(0)
        if (prepaidBalance.lessThan(paymentAmount)) {
          throw new Error('Insufficient prepaid balance')
        }
        break

      case 'POSTPAY':
        // ポストペイカード: 月間限度額チェック
        if (card.monthlyLimit) {
          const currentMonth = new Date()
          currentMonth.setDate(1)
          currentMonth.setHours(0, 0, 0, 0)

          const monthlyUsage = await prisma.transaction.aggregate({
            where: {
              cardId,
              date: {
                gte: currentMonth
              },
              type: 'EXPENSE'
            },
            _sum: {
              amount: true
            }
          })

          const currentUsage = monthlyUsage._sum.amount || new Decimal(0)
          if (currentUsage.plus(paymentAmount).greaterThan(card.monthlyLimit)) {
            throw new Error('Monthly limit exceeded')
          }
        }
        break
    }

    // 取引記録作成
    const transaction = await prisma.$transaction(async (tx) => {
      // デビット・プリペイドカードの残高更新
      if (card.type === 'DEBIT' || card.type === 'PREPAID') {
        const currentBalance = card.balance || new Decimal(0)
        await tx.card.update({
          where: { id: cardId },
          data: {
            balance: currentBalance.minus(paymentAmount)
          }
        })
      }

      // 取引作成
      const transaction = await tx.transaction.create({
        data: {
          amount: paymentAmount,
          currency,
          type: 'EXPENSE',
          description,
          date: new Date(),
          accountId: card.accountId,
          cardId,
          categoryId,
          userId
        }
      })

      return transaction
    })

    return transaction
  }

  /**
   * カード一覧取得
   */
  static async getCards(userId: string, includeInactive = false) {
    const where: any = { userId }
    if (!includeInactive) {
      where.isActive = true
    }

    const cards = await prisma.card.findMany({
      where,
      include: {
        account: true,
        linkedAccount: true,
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return cards
  }

  /**
   * カード詳細取得
   */
  static async getCardDetail(userId: string, cardId: string) {
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        userId
      },
      include: {
        account: true,
        linkedAccount: true,
        transactions: {
          take: 10,
          orderBy: {
            date: 'desc'
          }
        },
        autoTransfers: {
          take: 5,
          orderBy: {
            executedAt: 'desc'
          }
        }
      }
    })

    if (!card) {
      throw new Error('Card not found')
    }

    // 月間利用額を計算
    const currentMonth = new Date()
    currentMonth.setDate(1)
    currentMonth.setHours(0, 0, 0, 0)

    const monthlyUsage = await prisma.transaction.aggregate({
      where: {
        cardId,
        date: {
          gte: currentMonth
        },
        type: 'EXPENSE'
      },
      _sum: {
        amount: true
      }
    })

    return {
      ...card,
      monthlyUsage: monthlyUsage._sum.amount || new Decimal(0)
    }
  }
}