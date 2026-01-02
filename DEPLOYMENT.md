# 🚀 Deployment Guide для E-Learning Platform

Інструкції по deployment на **Cloudflare Pages** (фронтенд) + **Railway/Render** (бекенд) + **Cloudflare R2** (файли)

---

## 📋 **Архітектура**

```
┌─────────────────────────────────────────────────────┐
│  👤 Користувач                                       │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Cloudflare CDN     │
        │  (Global Network)   │
        └──────────┬──────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
┌───▼────────┐          ┌─────────▼──────┐
│ Frontend   │          │ Backend API     │
│ (Pages)    │◄────────►│ (Railway/Render)│
│ Static     │   API    │ Node.js/Express │
└────────────┘          └─────────┬───────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
          ┌─────────▼────────┐      ┌───────────▼─────────┐
          │ Cloudflare R2    │      │ PostgreSQL Database │
          │ (File Storage)   │      │ (Railway/Supabase)  │
          └──────────────────┘      └─────────────────────┘
```

---

## 🌐 **ЧАСТИНА 1: Фронтенд (Cloudflare Pages)**

### **1.1 Підготовка проекту**

```bash
cd Web-e-learning

# Перевір що .env.production налаштовано
cat .env.production
# Має бути: VITE_API_URL=https://your-backend.railway.app
```

### **1.2 Build локально (тестування)**

```bash
npm run build

# Перевір dist/ папку
ls dist/
# Має бути: index.html, assets/, ...
```

### **1.3 Deploy на Cloudflare Pages**

**Варіант A: Через Git (рекомендую)**

1. **Залий проект в GitHub/GitLab**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **В Cloudflare Dashboard:**
   - Йди на https://dash.cloudflare.com
   - Workers & Pages → Create application → Pages → Connect to Git
   - Обери свій репозиторій
   
3. **Налаштування build:**
   ```yaml
   Build command: npm run build
   Build output directory: dist
   Root directory: Web-e-learning
   Node version: 18
   ```

4. **Environment Variables:**
   ```bash
   VITE_API_URL=https://your-backend.railway.app
   # (буде заповнено після deployment бекенду)
   ```

5. **Натискай "Save and Deploy"**

**Варіант B: Через Wrangler CLI**

```bash
npm install -g wrangler
wrangler login
wrangler pages project create elearn-frontend
wrangler pages deploy dist --project-name elearn-frontend
```

### **1.4 Custom Domain (опційно)**

```bash
# В Cloudflare Pages settings:
Custom domains → Add custom domain → learn.yourdomain.com
```

**URL після deployment:**
- `https://elearn-frontend.pages.dev` (автоматичний)
- `https://learn.yourdomain.com` (якщо додав custom domain)

---

## ⚙️ **ЧАСТИНА 2: Бекенд (Railway / Render)**

### **2.1 Підготовка**

```bash
cd elearn-backend

# Скопіюй .env.example в .env
cp .env.example .env

# Заповни всі змінні (особливо R2!)
```

### **2.2 Deploy на Railway (рекомендую)**

**Чому Railway?**
- ✅ Безкоштовний tier ($5/місяць кредити)
- ✅ PostgreSQL вбудована
- ✅ Автоматичний SSL
- ✅ GitHub integration

**Кроки:**

1. **Створи проект на Railway:**
   ```bash
   # Встанови CLI
   npm install -g @railway/cli
   
   # Логін
   railway login
   
   # Створи проект
   railway init
   ```

2. **Додай PostgreSQL:**
   - В Railway Dashboard → New → Database → PostgreSQL
   - Скопіюй `DATABASE_URL` зі змінних

3. **Налаштуй Environment Variables:**
   ```bash
   # Автоматично з Railway UI або CLI:
   railway variables set DATABASE_URL="postgresql://..."
   railway variables set JWT_SECRET="your_secret_32_chars"
   railway variables set R2_ACCOUNT_ID="your_cloudflare_account"
   railway variables set R2_ACCESS_KEY_ID="your_r2_key"
   railway variables set R2_SECRET_ACCESS_KEY="your_r2_secret"
   railway variables set R2_BUCKET_NAME="elearn-files"
   railway variables set R2_PUBLIC_URL="https://your-bucket.r2.dev"
   railway variables set CORS_ORIGIN="https://elearn-frontend.pages.dev"
   railway variables set FRONTEND_URL="https://elearn-frontend.pages.dev"
   railway variables set NODE_ENV="production"
   railway variables set PORT="4000"
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Запусти міграції:**
   ```bash
   railway run npm run prisma:migrate
   railway run npm run seed
   ```

**Твій бекенд URL:** `https://your-app.railway.app`

---

### **2.3 Deploy на Render (альтернатива)**

**Чому Render?**
- ✅ Безкоштовний tier
- ✅ Автоматичний SSL
- ✅ Easy setup

**Кроки:**

1. **Створи Web Service:**
   - https://dashboard.render.com → New → Web Service
   - Connect GitHub repo
   
2. **Налаштування:**
   ```yaml
   Name: elearn-backend
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```

3. **Environment Variables** (додай всі з .env.example)

4. **Додай PostgreSQL:**
   - New → PostgreSQL
   - Copy `DATABASE_URL`

**Недолік:** Free tier засипає після 15 хв неактивності (перший запит повільний)

---

## 💾 **ЧАСТИНА 3: Cloudflare R2 (File Storage)**

### **3.1 Створи R2 Bucket**

1. **В Cloudflare Dashboard:**
   - R2 → Create bucket
   - Назва: `elearn-files`
   - Region: Automatic

2. **Створи API Token:**
   - R2 → Manage R2 API Tokens → Create API token
   - Permissions: Object Read & Write
   - Скопіюй: `Access Key ID` та `Secret Access Key`

3. **Отримай Account ID:**
   - В URL dashboard: `https://dash.cloudflare.com/YOUR_ACCOUNT_ID/r2`
   - Або в Settings → Account ID

### **3.2 Налаштуй Public Access (опційно)**

Якщо хочеш щоб файли були публічні:

```bash
# В R2 bucket settings:
Settings → Public Access → Allow Access
Custom Domain → r2.yourdomain.com (або використай dev subdomain)
```

**Public URL format:**
- Dev: `https://pub-xxxxx.r2.dev`
- Custom: `https://r2.yourdomain.com`

### **3.3 Перевір код storage.service.ts**

Файл вже налаштований! Переконайся що env змінні правильні:

```typescript
// elearn-backend/src/services/storage.service.ts
const s3 = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

---

## 🗄️ **ЧАСТИНА 4: База Даних**

### **Варіант A: Railway PostgreSQL (вбудована)**

Вже налаштовано якщо використовуєш Railway для бекенду.

### **Варіант B: Supabase (безкоштовна)**

1. **Створи проект:**
   - https://supabase.com → New project
   - Регіон: обери найближчий

2. **Отримай DATABASE_URL:**
   - Settings → Database → Connection string
   - Transaction mode (для Prisma)
   ```
   postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```

3. **Додай до Railway/Render env:**
   ```bash
   DATABASE_URL="postgresql://..."
   ```

### **Варіант C: Neon (serverless PostgreSQL)**

- https://neon.tech - serverless, auto-scaling
- Безкоштовний tier: 0.5 GB storage
- Отримай connection string та додай в env

---

## 🔐 **ЧАСТИНА 5: Secrets & Security**

### **5.1 Генеруй сильні secrets:**

```bash
# JWT_SECRET (32+ chars)
openssl rand -base64 32

# JWT_REFRESH_SECRET
openssl rand -base64 32
```

### **5.2 CORS налаштування:**

В бекенд `.env`:
```bash
# Production
CORS_ORIGIN="https://elearn-frontend.pages.dev,https://learn.yourdomain.com"

# Development (додай localhost)
CORS_ORIGIN="http://localhost:5173,https://elearn-frontend.pages.dev"
```

### **5.3 Rate Limiting (production):**

```bash
# Strict для production
RL_AUTH_LIMIT=10
RL_GENERAL_LIMIT=100
```

---

## ✅ **ЧАСТИНА 6: Фінальні кроки**

### **6.1 Оновлюй Frontend URL**

Після deployment бекенду:

```bash
# В Cloudflare Pages → Settings → Environment Variables
VITE_API_URL=https://your-app.railway.app
```

**Redeploy фронтенду:**
- Pages → Deployments → Retry deployment

### **6.2 Тестування**

```bash
# Перевір endpoints:
curl https://your-backend.railway.app/api/auth/csrf
curl https://your-backend.railway.app/api/i18n/bundle?lang=UA

# Перевір фронтенд:
# Відкрий https://elearn-frontend.pages.dev
# Спробуй login/register
```

### **6.3 Моніторинг**

- **Railway:** Logs → Real-time logs
- **Cloudflare:** Analytics → Web Analytics
- **R2:** Metrics → Storage usage

---

## 📊 **Pricing Estimate**

| Сервіс | Free Tier | Paid (якщо потрібно) |
|--------|-----------|---------------------|
| **Cloudflare Pages** | Unlimited requests | $0 (безкоштовно) |
| **Cloudflare R2** | 10 GB storage, 1M Class A requests/mo | $0.015/GB/month |
| **Railway** | $5 credits/mo (enough for small app) | $5-20/month |
| **Supabase** | 500 MB DB, 2 GB bandwidth | $25/month Pro |

**Мінімальна ціна:** $0-5/місяць (для малого проекту)

---

## 🐛 **Troubleshooting**

### **CORS errors:**
```bash
# Перевір CORS_ORIGIN в бекенд .env
# Має містити точну URL фронтенду
```

### **500 errors на /api/auth/csrf:**
```bash
# Перевір що бекенд запущений:
railway logs
# Або
render logs
```

### **Database connection failed:**
```bash
# Перевір DATABASE_URL
# Для Railway:
railway variables

# Тест connection:
railway run npm run db:status
```

### **R2 upload fails:**
```bash
# Перевір credentials:
echo $R2_ACCOUNT_ID
echo $R2_ACCESS_KEY_ID

# Тест:
railway run node -e "console.log(process.env.R2_ACCOUNT_ID)"
```

---

## 🎯 **Швидкий Checklist**

- [ ] Frontend deployed на Cloudflare Pages
- [ ] Backend deployed на Railway/Render
- [ ] PostgreSQL database створена
- [ ] Migrations виконані (`npm run prisma:migrate`)
- [ ] Seed data додано (`npm run seed`)
- [ ] R2 bucket створений
- [ ] R2 credentials налаштовані
- [ ] CORS правильно налаштований
- [ ] Frontend `VITE_API_URL` вказує на бекенд
- [ ] Login/Register працює
- [ ] Переклади завантажуються
- [ ] File upload працює (якщо використовуєш)

---

## 📚 **Додаткові ресурси**

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Railway Docs](https://docs.railway.app/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)

---

**Готово! 🎉** Твій проект ready for production!
