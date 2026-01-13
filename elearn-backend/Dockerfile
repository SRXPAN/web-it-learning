# ==========================================
# STAGE 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Копіюємо shared пакет, бо бекенд від нього залежить
COPY packages/shared ./packages/shared

# 2. Копіюємо бекенд
COPY elearn-backend ./elearn-backend

# 3. Встановлюємо залежності та білдимо Shared
WORKDIR /app/packages/shared
RUN npm install
RUN npm run build

# 4. Встановлюємо залежності та білдимо Backend
WORKDIR /app/elearn-backend
RUN npm install

# Генеруємо Prisma Client
RUN npx prisma generate

# Компілюємо TypeScript
RUN npm run build

# ==========================================
# STAGE 2: Production Runner
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# Встановлюємо OpenSSL (потрібен для Prisma в Alpine)
RUN apk add --no-cache openssl

# Копіюємо тільки потрібне з білдера
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/elearn-backend/package.json ./elearn-backend/package.json
COPY --from=builder /app/elearn-backend/dist ./elearn-backend/dist
COPY --from=builder /app/elearn-backend/node_modules ./elearn-backend/node_modules
COPY --from=builder /app/elearn-backend/src/prisma ./elearn-backend/src/prisma

WORKDIR /app/elearn-backend

# Експортуємо порт
EXPOSE 4000

# Запускаємо міграції та сервер
# Увага: в проді краще виносити міграції в окремий процес, але для простоти залишимо тут
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

