## Cloudflare Pages Deployment

Для деплою фронтенду на Cloudflare Pages:

### 📋 Налаштування

1. **GitHub Integration** (рекомендовано):
   - Підключить GitHub репозиторій до Cloudflare Pages
   - Вказати гілку `main` або `develop`
   - Cloudflare автоматично збирає при push

2. **Build Settings**:
   ```
   Framework preset: None (Custom)
   Build command: npm run build
   Build output directory: Web-e-learning/dist
   Root directory: Web-e-learning
   Node version: 22.x
   ```

3. **Environment Variables**:
   ```
   Production:
     VITE_API_URL=https://api.yourdomain.com
   
   Preview (Pull Requests):
     VITE_API_URL=https://api-staging.yourdomain.com
   ```

### 🚀 Команди збірки

```bash
# Локальна збірка для Cloudflare
npm run build:cloudflare

# Вручну (Wrangler CLI)
npm install -g @cloudflare/wrangler
wrangler login
wrangler pages deploy Web-e-learning/dist/
```

### 📁 Важні файли

- `_redirects` — SPA routing (всі маршрути → index.html)
- `public/_headers` — Cache-Control headers
- `wrangler.json` — Cloudflare конфіг

### ✅ Перевірка перед деплоєм

```bash
npm run build
npm run preview
# Тест http://localhost:4173/materials (повинна завантажитися)
```

Більше деталей в [CLOUDFLARE_GUIDE.md](CLOUDFLARE_GUIDE.md)
