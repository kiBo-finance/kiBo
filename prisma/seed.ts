import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 基本通貨データの挿入
  const currencies = [
    {
      code: 'JPY',
      symbol: '¥',
      name: '日本円',
      decimals: 0,
      isActive: true,
    },
    {
      code: 'USD',
      symbol: '$',
      name: '米ドル',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'EUR',
      symbol: '€',
      name: 'ユーロ',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'GBP',
      symbol: '£',
      name: 'イギリスポンド',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'AUD',
      symbol: 'A$',
      name: 'オーストラリアドル',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'CAD',
      symbol: 'C$',
      name: 'カナダドル',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'CHF',
      symbol: 'CHF',
      name: 'スイスフラン',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'CNY',
      symbol: '元',
      name: '中国人民元',
      decimals: 2,
      isActive: true,
    },
    {
      code: 'KRW',
      symbol: '₩',
      name: '韓国ウォン',
      decimals: 0,
      isActive: true,
    },
    {
      code: 'THB',
      symbol: '฿',
      name: 'タイバーツ',
      decimals: 2,
      isActive: true,
    },
  ]

  for (const currency of currencies) {
    const result = await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    })
    console.log(`✅ Created/Updated currency: ${result.code} (${result.name})`)
  }

  console.log('🌱 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
