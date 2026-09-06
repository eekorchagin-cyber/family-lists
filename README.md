# Family Lists

Семейные списки покупок: PWA, данные хранятся в браузере (`localStorage`).

## Как открыть на телефоне

**С телефона в любой сети** — после публикации:

https://eekorchagin-cyber.github.io/family-lists/

Добавить на домашний экран: в Safari «Поделиться → На экран Домой».

**В той же Wi‑Fi, что и компьютер** — запустите `npm run dev` и откройте Network-адрес из терминала, например `http://192.168.x.x:5173/`.

Макет уже заточен под телефон: ширина экрана до 480px.

## Локальный запуск

```bash
npm install
npm run dev
```

Откроется `http://localhost:5173/`.

## Семья и синхронизация

Сайт как сейчас: GitHub Pages + Supabase Free. Почту (Resend) не подключаем.

1. Создайте проект на [supabase.com](https://supabase.com).
2. Authentication → Providers → Email: выключите **Confirm email**.
3. SQL Editor: вставьте `supabase/schema.sql`.
4. Settings → API: скопируйте URL и `anon` ключ в `.env.local`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

5. Пересоберите сайт (`npm run build`) и залейте Pages — ключи попадают в сборку.

Без ключей приложение работает только на телефоне, как раньше. В настройках раздел «Семья».

