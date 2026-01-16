import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const g = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
    g.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? [] : ['error', 'warn'],
    })

if (process.env.NODE_ENV !== 'production') g.prisma = prisma

// Soft delete middleware for Material and Quiz models
prisma.$use(async (params, next) => {
  if (['Material', 'Quiz'].includes(params.model || '')) {
    if (params.action === 'findMany') {
      if (!params.args.where) params.args.where = {};
      if (params.args.where.deletedAt === undefined) params.args.where.deletedAt = null;
    }
    if (params.action === 'findFirst' || params.action === 'findUnique') {
      params.action = 'findFirst';
      params.args.where.deletedAt = null;
    }
  }
  return next(params);
});