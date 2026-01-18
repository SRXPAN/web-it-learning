# ==========================================
# STAGE 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Важливо: Копіюємо package files для кешування шарів Docker
# Це пришвидшить білд, якщо залежності не змінилися
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY elearn-backend/package.json ./elearn-backend/

# 1. Копіюємо сирцевий код
COPY packages/shared ./packages/shared
COPY elearn-backend ./elearn-backend

# 2. Встановлюємо залежності та білдимо Shared
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build

# 3. Встановлюємо залежності та білдимо Backend
WORKDIR /app/elearn-backend
RUN npm install

# Генеруємо Prisma Client (важливо робити це до білда TS)
RUN npx prisma generate

# Компілюємо TypeScript
RUN npm run build

# ОПТИМІЗАЦІЯ: Видаляємо devDependencies перед копіюванням у прод
# Це зменшить розмір фінального образу на 30-50%
RUN npm prune --production

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app/elearn-backend

# Встановлюємо NODE_ENV
ENV NODE_ENV=production

# Встановлюємо OpenSSL (потрібен для Prisma в Alpine)
RUN apk add --no-cache openssl

# Копіюємо скомпільований Shared (якщо він потрібен у рантаймі)
COPY --from=builder /app/packages/shared/dist ../packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ../packages/shared/package.json

# Копіюємо Backend
COPY --from=builder /app/elearn-backend/package.json ./
COPY --from=builder /app/elearn-backend/dist ./dist
# Копіюємо тільки prod modules (завдяки npm prune вище)
COPY --from=builder /app/elearn-backend/node_modules ./node_modules
# Копіюємо схему Prisma для міграцій
COPY --from=builder /app/elearn-backend/src/prisma ./src/prisma

# Експортуємо порт
EXPOSE 4000

# Запускаємо: 1. Міграції, 2. Сервер
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]