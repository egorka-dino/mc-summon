# mc-commands
  Генераторы команд Minecraft Java Edition 1.21.5+.

  ## Структура файлов
  - `app/page.tsx` — React-лендинг mc-commands
  - `app/summon/page.tsx` — React-страница генератора `/summon`
  - `app/components/summon/` — общий React-редактор `/summon`
  - `app/give/page.tsx` — React-страница генератора `/give`
  - `app/components/give/` — React-редактор `/give`
  - `app/admin/` — админка шаблонов мобов
  - `app/api/` — healthcheck, auth status и API шаблонов
  - `style.css` — общий CSS публичных страниц

  ## Ключевые факты
  - Формат предметов: components:{enchantments:{id:lvl}} (без levels, было в 1.20.5)
  - Снаряжение мобов: единый блок equipment:{head, chest, legs, feet, mainhand, offhand}
  - /give: компоненты в квадратных скобках [comp=val,...], формат 1.21.5
  - Избранное `/give` хранится в `localStorage` с ключом `mc-give:favorites`
  - Деплой: Vercel, production URL `https://mc-commands.vercel.app`; кастомный домен `mc-commands.egorka.fun`

  ## Стиль
  - Интерфейс на русском
  - Next.js App Router, TypeScript и React
  - Новые внешние зависимости добавлять только при явной пользе
