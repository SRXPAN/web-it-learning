# 🚀 Quick Start Guide

## Запуск локально (Development)

### 1️⃣ **Перший раз (Setup)**

```bash
# 1. Встанови dependencies
cd elearn-backend && npm install
cd ../Web-e-learning && npm install
cd ../packages/shared && npm install

# 2. Налаштуй .env файли
# Backend вже має .env
# Frontend потребує створення:
cd ../Web-e-learning
echo "VITE_API_URL=http://localhost:4000" > .env.development

# 3. Запусти PostgreSQL
# Переконайся що PostgreSQL запущений на localhost:5432

# 4. Запусти міграції та seed
cd ../elearn-backend
npm run prisma:migrate
npm run seed

# 5. Перевір що все ОК
npm run db:status
```

---

### 2️⃣ **Щоденний запуск**

**Термінал 1 (Backend):**
```bash
cd elearn-backend
npm run dev
# Бекенд запуститься на http://localhost:4000
```

**Термінал 2 (Frontend):**
```bash
cd Web-e-learning
npm run dev
# Фронтенд запуститься на http://localhost:5173
```

**Відкрий браузер:** http://localhost:5173

---

### 3️⃣ **Швидкі команди**

```bash
# Перевірити стан бази даних
cd elearn-backend && npm run db:status

# Перезавантажити дані (ВИДАЛЯЄ ВСЕ!)
npm run db:reset:confirm

# Запустити тести
npm test

# Запустити тести з coverage
npm run test:coverage

# Перевірити переклади
npm run i18n:check
```

---

## 🐛 **Якщо щось не працює**

### ❌ **500 Error на /api/auth/csrf**

**Проблема:** Бекенд не запущений або недоступний.

**Рішення:**
```bash
# Перевір чи запущений бекенд
cd elearn-backend
npm run dev

# Перевір порт
netstat -ano | findstr :4000
```

---

### ❌ **CORS Error**

**Проблема:** CORS_ORIGIN не налаштований.

**Рішення:**
```bash
# В elearn-backend/.env додай:
CORS_ORIGIN="http://localhost:5173"
```

---

### ❌ **Database connection error**

**Проблема:** PostgreSQL не запущений або неправильний пароль.

**Рішення:**
```bash
# Перевір чи працює PostgreSQL:
psql -U postgres -h localhost -p 5432

# Якщо не працює - запусти:
# Windows: Services → PostgreSQL → Start
# або через pgAdmin
```

---

### ❌ **Translation keys показують "nav.dashboard" замість тексту**

**Проблема:** База даних не містить перекладів.

**Рішення:**
```bash
cd elearn-backend
npm run seed
# Або
npm run i18n:seed
```

---

### ❌ **Port 4000 вже зайнятий**

**Рішення:**
```bash
# Знайди процес:
netstat -ano | findstr :4000

# Вбий процес (замінити PID):
taskkill /F /PID <номер_процесу>

# Або змінити порт в .env:
PORT=4001
```

---

## 📦 **Production Build**

```bash
# Frontend
cd Web-e-learning
npm run build
# Результат в: dist/

# Backend
cd ../elearn-backend
npm run build
npm start
# Результат в: dist/
```

---

## 🔗 **Корисні посилання**

- [Deployment Guide](./DEPLOYMENT.md) - повна інструкція по production deployment
- [Cleanup Guide](./CLEANUP_COMPLETED.md) - що було видалено/оптимізовано
- [Problems Analysis](./PROBLEMS_ANALYSIS.md) - аналіз проблем

---

## ✅ **Checklist перед commit**

- [ ] `npm test` проходить без помилок
- [ ] `npm run build` успішний
- [ ] Переклади працюють (перевір UA/PL/EN)
- [ ] Login/Register працює
- [ ] Немає console errors в браузері
- [ ] .env файли НЕ додані в git

---

**Готово! Запускай і тестуй! 🎉**
