# ImageHost — Корпоративный хостинг изображений

Enterprise-grade image hosting platform с продвинутой аутентификацией, защитой от DDoS-атак и мощной админ-панелью.

## Возможности

- 🔐 JWT аутентификация с refresh токенами
- 🛡️ Защита от brute-force атак
- 📊 Rate limiting с Redis
- 🖼️ Автоматическая генерация превью изображений
- 👨‍💼 Ролевая модель (ADMIN, MODERATOR, USER)
- 📋 Админ-панель с аудит-логами
- 🔒 Блокировка IP и пользователей
- 📦 Docker-контейнеризация

## Требования

- Node.js 20+
- PostgreSQL 15+
- Redis 7+

## Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/your-org/imagehost.git
cd imagehost
npm install
```

### 2. Настройка окружения

```bash
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Инициализация базы данных

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Запуск

```bash
# Разработка
npm run dev

# Или через Docker
npm run docker:build
npm run docker:up
```

## Структура проекта

```
imagehost/
├── backend/           # Express API
│   ├── src/
│   │   ├── controllers/    # Контроллеры
│   │   ├── middleware/     # Middleware
│   │   ├── routes/         # Маршруты
│   │   └── utils/          # Утилиты
│   └── prisma/            # Схема БД
├── frontend/          # Next.js
│   ├── src/
│   │   ├── app/            # Страницы
│   │   ├── components/     # UI компоненты
│   │   └── hooks/          # React хуки
│   └── public/
└── nginx/              # Reverse proxy
```

## API Endpoints

### Auth
- `POST /api/auth/login` — Вход
- `POST /api/auth/logout` — Выход
- `GET /api/auth/me` — Текущий пользователь

### Images
- `POST /api/images` — Загрузка изображения
- `GET /api/images` — Список изображений
- `GET /api/images/:id` — Получить изображение

### Admin
- `GET /api/admin/users` — Список пользователей
- `POST /api/admin/users` — Создание пользователя
- `POST /api/admin/users/:id/block` — Блокировка пользователя
- `GET /api/admin/stats` — Статистика

## Безопасность

Все маршруты защищены:
- JWT токены (access/refresh)
- Middleware проверки ролей
- Rate limiting
- Brute-force защита
- Helmet для HTTP заголовков

## Лицензия

MIT