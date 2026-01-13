# Cloudflare Pages Build Configuration

Для деплою на **Cloudflare Pages** потрібна така конфіграція:

## 📋 Крок 1: Cloudflare Pages Settings

У дашборді Cloudflare Pages встановіть:

```
Build command: npm run build
Build output directory: dist
Root directory: Web-e-learning
Node version: 22
```

## 🔐 Крок 2: Environment Variables

Додайте у Cloudflare Pages → Settings → Environment Variables:

```
Production:
  VITE_API_URL=https://api.yourdomain.com

Preview (development):
  VITE_API_URL=https://api-staging.yourdomain.com
```

## 📁 Крок 3: Файли конфіки

Проект містить файли для Cloudflare:

- **`wrangler.json`** — конфіг для Cloudflare Workers (якщо буде потрібно)
- **`_redirects`** — перенаправлення маршрутів SPA
- **`public/_headers`** — cache-control headers
- **`vite.config.ts`** — оптимізована збірка

## 🚀 Крок 4: Деплой

### Варіант A: GitHub Integration (рекомендовано)

1. Пуш у GitHub
2. Cloudflare Pages автоматично збирає та розгортає

### Варіант B: Wrangler CLI

```bash
# Встановити Wrangler
npm install -g @cloudflare/wrangler

# Залогіниться
wrangler login

# Деплой
npm run build
wrangler pages deploy dist/
```

### Варіант C: Drag & Drop

1. Збірка локально: `npm run build`
2. Відкрити Cloudflare Pages
3. Перетягнути папку `dist/`

## ⚠️ Можливі проблеми і рішення

### 1️⃣ **Build timeout**
```bash
# Рішення: збільшити памяті і прискорити збірку
npm run build
# або у Cloudflare змінити timeout на 30+ хвилин
```

### 2️⃣ **Missing environment variables**
```bash
# Переконатися що VITE_API_URL встановлено у Cloudflare Pages
# В локалі: створіть .env.local
VITE_API_URL=https://your-api.com
```

### 3️⃣ **Routing не працює (404 на SPA маршрутах)**
```bash
# Файл _redirects повинен бути у корені dist/ після збірки
# Cloudflare Pages автоматично обробляє цей файл
```

### 4️⃣ **CORS помилки**
```bash
# Налаштувати CORS на бекенді для домену Cloudflare
CORS_ORIGIN=https://yourdomain.pages.dev
```

### 5️⃣ **Node version mismatch**
```bash
# У Cloudflare Pages → Settings → Build → Node version
# Виберіть Node 22 (або той же що у engines.node у package.json)
```

## 🔍 Перевірка перед деплоєм

```bash
# 1. Локальна збірка
npm run build

# 2. Перевірити dist/
ls -la dist/
# Повинні бути: index.html, assets/, тощо

# 3. Preview
npm run preview
# Відкрити http://localhost:4173

# 4. Перевірити routing
# Навігуватися на маршрути типу http://localhost:4173/materials
# Повинна завантажитися сторінка без 404
```

## 📊 Оптимізація для Cloudflare

### Кешування
- **HTML**: 3600s (реревалідація)
- **JS/CSS**: 31536000s (1 рік, immutable)
- **API**: no-cache (всі запити)

### Performance
- **Minification**: Terser (вимикаємо console.log)
- **Sourcemaps**: Вимкнено (експорт)
- **Build output**: Оптимізований dist/

## 🌍 Всередину Cloudflare

### Timezone/Localization
- Cloudflare автоматично обслуговує з найближчого датацентру
- Коротше latency для користувачів

### DDoS Protection
- Cloudflare Pages включає DDOS захист
- 2-20 днів storia

### SSL/TLS
- Автоматично від Cloudflare
- HTTPS на всіх запитах

## 📞 Контакти для налаштування

```
Cloudflare Docs: https://developers.cloudflare.com/pages/
Wrangler CLI: https://developers.cloudflare.com/workers/wrangler/install-and-update/
```
