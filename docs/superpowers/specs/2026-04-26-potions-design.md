# Именованные зелья в /give — Design Spec

**Дата:** 2026-04-26  
**Файл:** `give.html`

---

## Цель

Заменить 4 generic-пункта зелий в списке предметов на ~20 именованных зелий с возможностью выбрать тип (обычное / бросаемое / длительное / стрела) и мощность (обычное / продлённое / усиленное II).

---

## Данные

Новая константа `POTIONS` — массив `[id, ruName, hasLong, hasStrong]`:

```js
const POTIONS = [
  ['swiftness',       'Зелье скорости',               true,  true ],
  ['slowness',        'Зелье замедления',              true,  true ],
  ['strength',        'Зелье силы',                   true,  true ],
  ['healing',         'Зелье исцеления',               false, true ],
  ['harming',         'Зелье вреда',                   false, true ],
  ['regeneration',    'Зелье регенерации',             true,  true ],
  ['poison',          'Зелье яда',                     true,  true ],
  ['fire_resistance', 'Зелье огнестойкости',           true,  false],
  ['water_breathing', 'Зелье подводного дыхания',      true,  false],
  ['night_vision',    'Зелье ночного зрения',          true,  false],
  ['invisibility',    'Зелье невидимости',             true,  false],
  ['leaping',         'Зелье прыгучести',              true,  true ],
  ['weakness',        'Зелье слабости',                true,  false],
  ['luck',            'Зелье удачи',                   false, false],
  ['turtle_master',   'Зелье черепахи',                true,  true ],
  ['slow_falling',    'Зелье медленного падения',      true,  false],
  ['wind_charged',    'Зелье ветряного заряда',        false, false],
  ['weaving',         'Зелье плетения',                false, false],
  ['oozing',          'Зелье просачивания',            false, false],
  ['infested',        'Зелье заражения',               false, false],
];
```

Категория «Зелья» в `ITEMS` генерируется из `POTIONS`:

```js
{ name: 'Зелья', items: POTIONS.map(([id, name]) => [`potion:${id}`, name]) }
```

Старые 4 пункта (`potion`, `splash_potion`, `lingering_potion`, `tipped_arrow`) удаляются.

---

## UI — секция «Параметры зелья»

Новая секция `#section-potion` появляется под остальными секциями когда выбран предмет с ID вида `potion:*`.

Две колонки (`grid-2`):

**Тип** (radio `name="potion-type"`, default: `potion`):
- Обычное → `potion`
- Бросаемое → `splash_potion`
- Длительное → `lingering_potion`
- Зачарованная стрела → `tipped_arrow`

**Мощность** (radio `name="potion-modifier"`, default: `normal`):
- Обычное → эффект без префикса
- Продлённое → префикс `long_` (скрыто если `hasLong = false`)
- Усиленное II → префикс `strong_` (скрыто если `hasStrong = false`)

Пример: «Зелье силы» + Бросаемое + Усиленное II →
```
/give @s minecraft:splash_potion[potion_contents={potion:"minecraft:strong_strength"}] 1
```

---

## JS-изменения

### Хелпер

```js
function isPotion(id) { return (id || '').startsWith('potion:'); }
```

### `onItemChange()`

```js
document.getElementById('section-potion').style.display = isPotion(itemId) ? '' : 'none';
if (isPotion(itemId)) updatePotionModifiers(itemId);
```

### `updatePotionModifiers(itemId)` — новая функция

- Ищет запись в `POTIONS` по `id = itemId.split(':')[1]`
- Прячет `#potion-mod-long` если `hasLong = false`
- Прячет `#potion-mod-strong` если `hasStrong = false`
- Если текущий выбранный модификатор стал недоступным — сбрасывает на `normal`

### `buildComponents()`

Добавляет компонент `potion_contents` если выбрано зелье:

```js
if (isPotion(rawItemId)) {
  const base = rawItemId.split(':')[1];
  const mod = document.querySelector('input[name="potion-modifier"]:checked')?.value || 'normal';
  const effectId = mod === 'long' ? `long_${base}` : mod === 'strong' ? `strong_${base}` : base;
  comps.push(`potion_contents={potion:"minecraft:${effectId}"}`);
}
```

### `generate()`

Подставляет реальный item ID из radio «Тип»:

```js
let itemId = document.getElementById('item-select').value;
if (isPotion(itemId)) {
  itemId = document.querySelector('input[name="potion-type"]:checked')?.value || 'potion';
}
```

`buildComponents()` получает `rawItemId = document.getElementById('item-select').value` самостоятельно (до разрешения типа), чтобы обнаружить зелье и добавить `potion_contents`.

### Избранное (snapshot)

**Сохранение** — добавить в объект снапшота:
```js
potionType: document.querySelector('input[name="potion-type"]:checked')?.value || 'potion',
potionModifier: document.querySelector('input[name="potion-modifier"]:checked')?.value || 'normal',
```

**Восстановление** — после `onItemChange()`:
```js
if (isPotion(snap.itemId)) {
  const typeEl = document.querySelector(`input[name="potion-type"][value="${snap.potionType || 'potion'}"]`);
  if (typeEl) typeEl.checked = true;
  updatePotionModifiers(snap.itemId);
  const modEl = document.querySelector(`input[name="potion-modifier"][value="${snap.potionModifier || 'normal'}"]`);
  if (modEl && modEl.closest('label').style.display !== 'none') modEl.checked = true;
}
```

### `resetAll()`

Сбросить radio-кнопки зелья на дефолты:
```js
document.querySelector('input[name="potion-type"][value="potion"]').checked = true;
document.querySelector('input[name="potion-modifier"][value="normal"]').checked = true;
```

---

## Что не меняется

- Поиск по предметам работает без изменений (ищет по `ruName` из POTIONS)
- Зачарования, имя, лор — применяются как обычно
- `enchantments`, `FOOD_ITEMS`, `canHaveTrim` — не пересекаются с `potion:*` ID
