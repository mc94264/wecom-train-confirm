import { PrismaClient } from '@prisma/client'
import * as path from 'path'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const dbUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.startsWith('file:')
    ? `file:${path.resolve(process.cwd(), process.env.DATABASE_URL.replace('file:', ''))}`
    : process.env.DATABASE_URL
  : `file:${path.resolve(process.cwd(), 'prisma/dev.db')}`

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
