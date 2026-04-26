# Дизайн: страница /give + реструктуризация в mc-commands

**Дата:** 2026-04-26  
**Проект:** mc-summon → mc-commands  
**Minecraft:** Java Edition 1.21.5+

---

## Контекст

Текущий сайт — один файл `index.html` с генератором `/summon`. Задача: добавить генератор `/give`, вынести `/summon` на отдельную страницу, создать лендинг «mc-commands».

---

## Структура файлов

```
mc-summon/
├── index.html        ← лендинг «mc-commands», две карточки-ссылки
├── summon.html       ← текущий index.html (CSS → style.css, добавить nav)
├── give.html         ← новая страница генератора /give
└── style.css         ← общий CSS: переменные, шрифты, кнопки, панели, утилиты
```

GitHub Pages поддерживает несколько HTML-файлов в корне репозитория.

---

## index.html (лендинг)

- Заголовок: «MC-COMMANDS» (Press Start 2P)
- Подзаголовок: «Генераторы команд для Minecraft Java Edition 1.21.5+»
- Две карточки-ссылки в стиле существующего дизайна:
  - `/summon` → summon.html
  - `/give` → give.html
- Футер с версией

---

## summon.html

Текущий `index.html` с минимальными изменениями:
- `<style>` заменяется на `<link rel="stylesheet" href="style.css">`
- В шапке добавляется ссылка «← mc-commands» (ведёт на index.html)
- Всё остальное без изменений

---

## give.html

### Шапка
- Заголовок: «ГЕНЕРАТОР /GIVE»
- Подзаголовок: «Minecraft Java Edition 1.21.5+»
- Ссылка «← mc-commands» → index.html

### Панель: Цель и предмет

**Цель:**
- Дропдаун: `@s` (по умолчанию), `@p`, `@a`, `@r`
- Текстовое поле рядом — для произвольного селектора (`@a[team=red]`, имя игрока)
- Итоговая цель = значение текстового поля если заполнено, иначе дропдаун

**Предмет:**
- Поиск (input) фильтрует по рус. названию и item_id — как поиск моба в summon.html
- Grouped `<select>` со всеми предметами 1.21.5 (≈400–600 позиций)
- Поле «Количество» (1–64, по умолчанию 1)

### Группы предметов

| Группа | Содержимое |
|---|---|
| Мечи | wooden→netherite_sword |
| Топоры | wooden→netherite_axe |
| Луки и арбалеты | bow, crossbow |
| Другое оружие | trident, mace |
| Инструменты | pickaxe, shovel, hoe, shears, flint_and_steel, fishing_rod, brush, spyglass, карты |
| Шлемы | leather→netherite, turtle_helmet, carved_pumpkin, все черепа |
| Нагрудники | leather→netherite, elytra |
| Штаны | leather→netherite |
| Ботинки | leather→netherite |
| Еда | все съедобные предметы |
| Зелья | potion, splash_potion, lingering_potion, tipped_arrow |
| Блоки | command_block, chest, furnace, основные строительные блоки |
| Материалы | слитки, самоцветы, пыль, перья, и т.д. |
| Особые | totem_of_undying, nether_star, beacon, dragon_egg, firework_rocket, shield, elytra |
| Прочее | map, compass, clock, book, writable_book, name_tag, saddle, и т.д. |

### Панель: Коллекция любимчиков

Идентичная система из summon.html:
- localStorage ключ: `mc-give:favorites`
- Snapshot/restore через поля формы
- Карточки с именем, кнопками «Загрузить», «Переименовать», «Копировать команду», «Удалить»
- Toast-уведомления

### Панель: Параметры предмета

Динамические секции — показываются/скрываются при смене предмета.

#### Имя и лор (всегда видна)
- Поле «Кастомное имя» + цвет (те же NAME_COLORS) + bold/italic чекбоксы
- До 5 строк лора (textarea или отдельные input-ы), каждая с цветом

#### Зачарования
- Видна только для зачаровываемых предметов (логика `enchantsForItem`)
- Список чекбоксов + level input — идентично summon.html

#### Кожаная броня (окраска)
- Видна только для `leather_*` предметов
- Color picker для `dyed_color`

#### Отделка брони (trim)
- Видна только для металлической/цепной/алмазной/незеритовой брони
- Дропдауны материал + узор — идентично summon.html

#### Еда
- Видна только для food-предметов
- Питательность (int, 0–20)
- Насыщение (float, 0.0–20.0)
- Чекбокс «Можно есть с полным голодом» (`can_always_eat`)
- До 5 эффектов: дропдаун эффекта + шанс (0.0–1.0) + сила (0–255) + длительность в тиках

#### Тотем (для любого предмета)
- Чекбокс «Действует как тотем бессмертия»
- При включении: показывает список эффектов после срабатывания
- Дефолты (как ванильный тотем): регенерация II 900 тиков, поглощение II 100 тиков, огнестойкость I 800 тиков
- Эффекты редактируются (добавить/удалить)
- Генерирует два компонента:
  - `death_protection={death_effects:[{type:"minecraft:totem_of_undying"}]}`
  - `consumable={consume_seconds:0.0,animation:"none",on_consume_effects:[{type:"minecraft:apply_effects",effects:[{id:"minecraft:regeneration",duration:900,amplifier:1},{id:"minecraft:absorption",duration:100,amplifier:1},{id:"minecraft:fire_resistance",duration:800,amplifier:0}]}]}`

#### Фейерверк (только для `firework_rocket`)
- Длительность полёта: 1 / 2 / 3 (radio или select)
- Список взрывов (до 8), кнопка «+ Добавить взрыв»
- Каждый взрыв:
  - Форма: small_ball / large_ball / star / creeper / burst
  - До 8 основных цветов (color picker + кнопка добавить/удалить)
  - До 8 цветов затухания (fade, аналогично)
  - Чекбокс «След» (`has_trail`)
  - Чекбокс «Мерцание» (`has_twinkle`)
  - Кнопка «Удалить взрыв»

### Панель: Готовая команда

Формат (1.21.5):
```
/give @s minecraft:diamond_sword[enchantments={sharpness:5,unbreaking:3},custom_name='{"text":"Меч","color":"gold"}'] 1
```

- `<div>` с VT323, зелёный текст на чёрном фоне — идентично summon.html
- Счётчик символов (красный если > 256, предупреждение про command_block)
- Кнопки: «Копировать», «Обновить», «Сброс»

---

## style.css

Содержит всё что сейчас в `<style>` index.html:
- CSS-переменные (цвета, шрифты)
- Базовые элементы (body, header, footer, .container)
- .panel, .section, .slot
- .enchant-list, .enchant-row
- Кнопки, inputs, selects
- .fav-card, .favorites-grid
- Toast
- Media queries

Каждая страница может добавлять страничную специфику в свой `<style>`.

---

## Формат компонентов /give (1.21.5)

Компоненты передаются в квадратных скобках через запятую:

```
/give @s minecraft:item[component1=value1,component2=value2] count
```

Ключевые компоненты:
- `enchantments={id:lvl,...}` — зачарования (без `levels:`, изменено в 1.20.5)
- `custom_name='<json>'` — имя (JSON-строка в одинарных кавычках)
- `lore=['<json>',...]` — лор
- `dyed_color=<int>` — цвет кожаной брони (RGB int)
- `trim={material:"...",pattern:"..."}` — отделка брони
- `food={nutrition:N,saturation:F,can_always_eat:true,effects:[...]}` — параметры еды
- `death_protection={death_effects:[...]}` — тотем-поведение
- `fireworks={flight_duration:N,explosions:[{shape:...,colors:[I;...],fade_colors:[I;...],has_trail:true,has_twinkle:true},...]}` — фейерверк

---

## Технические решения

- Нет фреймворков, нет сборки — чистый HTML/JS
- Общие данные (ENCHANTS, EFFECTS, NAME_COLORS, TRIM_*) дублируются в give.html (или выносятся в отдельный `data.js` — оставить на усмотрение при имплементации)
- Поиск предметов — та же функция `filterMobSelect` адаптированная для items
- Динамическое показывание секций — проверка item_id при каждом `change` на `<select>`
- Генерация команды — аналог `buildNBTPartsFor` но для компонентного формата `/give`
- Favorites snapshot — те же поля формы через `data-field`, ключ `mc-give:favorites`
