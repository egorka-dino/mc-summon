export type SummonFieldValue = string | number | boolean | null;

export type SummonSnapshot = {
  mobOrder: Array<{ mobType: string }>;
  fields: Record<string, SummonFieldValue>;
};


export const MOB_GROUPS = [
  { name: 'Враждебные', mobs: [
    ['zombie', 'Зомби'], ['husk', 'Кадавр'], ['drowned', 'Утопленник'], ['zombie_villager', 'Зомби-житель'],
    ['skeleton', 'Скелет'], ['stray', 'Заблудший'], ['wither_skeleton', 'Скелет-иссушитель'], ['bogged', 'Замшелый скелет'],
    ['creeper', 'Крипер'], ['spider', 'Паук'], ['cave_spider', 'Пещерный паук'],
    ['enderman', 'Странник Края'], ['endermite', 'Эндермит'], ['silverfish', 'Чешуйница'],
    ['zombified_piglin', 'Зомби-пиглин'], ['piglin', 'Пиглин'], ['piglin_brute', 'Пиглин-громила'],
    ['blaze', 'Ифрит'], ['ghast', 'Гаст'], ['magma_cube', 'Магма-куб'], ['slime', 'Слизень'],
    ['hoglin', 'Хоглин'], ['zoglin', 'Зоглин'], ['shulker', 'Шалкер'], ['vex', 'Досаждатель'],
    ['evoker', 'Призыватель'], ['vindicator', 'Поборник'], ['pillager', 'Разбойник'],
    ['ravager', 'Разоритель'], ['illusioner', 'Иллюзионист'], ['witch', 'Ведьма'], ['phantom', 'Фантом'],
    ['guardian', 'Страж'], ['elder_guardian', 'Древний страж'], ['warden', 'Хранитель'],
    ['breeze', 'Бриз'], ['creaking', 'Скрипень'],
  ]},
  { name: 'Боссы', mobs: [
    ['ender_dragon', 'Дракон Края'], ['wither', 'Иссушитель'],
  ]},
  { name: 'Нейтральные', mobs: [
    ['wolf', 'Волк'], ['polar_bear', 'Белый медведь'], ['panda', 'Панда'], ['dolphin', 'Дельфин'],
    ['fox', 'Лиса'], ['goat', 'Коза'], ['llama', 'Лама'], ['trader_llama', 'Торговая лама'],
    ['bee', 'Пчела'], ['iron_golem', 'Железный голем'], ['snow_golem', 'Снежный голем'],
    ['pufferfish', 'Рыба-фугу'],
  ]},
  { name: 'Мирные', mobs: [
    ['cow', 'Корова'], ['mooshroom', 'Грибная корова'], ['pig', 'Свинья'], ['sheep', 'Овца'],
    ['chicken', 'Курица'], ['rabbit', 'Кролик'],
    ['horse', 'Лошадь'], ['donkey', 'Осёл'], ['mule', 'Мул'], ['skeleton_horse', 'Скелет-лошадь'], ['zombie_horse', 'Зомби-лошадь'],
    ['cat', 'Кошка'], ['ocelot', 'Оцелот'], ['parrot', 'Попугай'],
    ['villager', 'Житель'], ['wandering_trader', 'Странствующий торговец'],
    ['axolotl', 'Аксолотль'], ['frog', 'Лягушка'], ['tadpole', 'Головастик'], ['turtle', 'Черепаха'],
    ['bat', 'Летучая мышь'], ['squid', 'Кальмар'], ['glow_squid', 'Сияющий кальмар'],
    ['cod', 'Треска'], ['salmon', 'Лосось'], ['tropical_fish', 'Тропическая рыба'],
    ['camel', 'Верблюд'], ['sniffer', 'Нюхач'], ['armadillo', 'Броненосец'], ['allay', 'Аллай'],
    ['strider', 'Лавоход'], ['happy_ghast', 'Добрый гаст'],
  ]},
  { name: 'Прочее', mobs: [
    ['armor_stand', 'Стойка для брони'], ['item_frame', 'Рамка'], ['glow_item_frame', 'Сияющая рамка'],
    ['minecart', 'Вагонетка'], ['boat', 'Лодка'], ['tnt', 'Динамит'],
    ['fireball', 'Фаерболл'], ['firework_rocket', 'Фейерверк'], ['experience_orb', 'Сфера опыта'],
    ['lightning_bolt', 'Молния'], ['area_effect_cloud', 'Облако эффектов'],
  ]},
];


export type SummonTemplateLike = SummonSnapshot & {
  id: string;
  category: string;
  name: string;
  description: string;
  version: number;
  enabled?: boolean;
};

export const RANDOM_MOBS = [
  'zombie', 'husk', 'drowned', 'skeleton', 'stray', 'wither_skeleton', 'bogged',
  'creeper', 'spider', 'cave_spider', 'enderman', 'silverfish', 'zombified_piglin',
  'piglin', 'piglin_brute', 'blaze', 'magma_cube', 'slime', 'hoglin', 'zoglin',
  'vex', 'evoker', 'vindicator', 'pillager', 'ravager', 'witch', 'phantom',
  'guardian', 'warden', 'breeze', 'creaking', 'wolf', 'fox', 'goat', 'bee',
  'iron_golem', 'snow_golem', 'cow', 'pig', 'sheep', 'chicken', 'rabbit',
  'horse', 'skeleton_horse', 'zombie_horse', 'cat', 'parrot', 'villager',
  'axolotl', 'frog', 'turtle', 'camel', 'sniffer', 'armadillo', 'allay',
  'strider', 'happy_ghast'
];

export const RANDOM_BABY_MOBS = new Set([
  'zombie', 'husk', 'drowned', 'zombie_villager', 'zombified_piglin', 'piglin',
  'hoglin', 'zoglin', 'cow', 'mooshroom', 'pig', 'sheep', 'chicken', 'rabbit',
  'horse', 'donkey', 'mule', 'cat', 'ocelot', 'fox', 'goat', 'llama',
  'trader_llama', 'wolf', 'panda', 'bee', 'villager', 'turtle', 'camel',
  'sniffer', 'armadillo'
]);

export const RANDOM_NAMES = [
  'Громила', 'Искатель', 'Шалун', 'Хранитель', 'Капитан', 'Бродяга',
  'Сюрприз', 'Прыг-Скок', 'Ночной гость', 'Легенда', 'Зубастик', 'Босс'
];

export const SLOTS = [
  { key: 'head', label: 'Шлем',         items: ['netherite_helmet','diamond_helmet','iron_helmet','golden_helmet','chainmail_helmet','leather_helmet','turtle_helmet','carved_pumpkin','player_head','zombie_head','skeleton_skull','creeper_head','dragon_head','piglin_head'] },
  { key: 'chest', label: 'Нагрудник',   items: ['netherite_chestplate','diamond_chestplate','iron_chestplate','golden_chestplate','chainmail_chestplate','leather_chestplate','elytra'] },
  { key: 'legs',  label: 'Штаны',        items: ['netherite_leggings','diamond_leggings','iron_leggings','golden_leggings','chainmail_leggings','leather_leggings'] },
  { key: 'feet',  label: 'Ботинки',      items: ['netherite_boots','diamond_boots','iron_boots','golden_boots','chainmail_boots','leather_boots'] },
  { key: 'mainhand', label: 'Правая рука (оружие)', items: ['netherite_sword','diamond_sword','iron_sword','golden_sword','stone_sword','wooden_sword','netherite_axe','diamond_axe','iron_axe','golden_axe','stone_axe','bow','crossbow','trident','mace','totem_of_undying','shield','stick','blaze_rod','nether_star','ender_pearl','snowball','egg','fire_charge'] },
  { key: 'offhand',  label: 'Левая рука', items: ['totem_of_undying','shield','bow','crossbow','torch','arrow','spectral_arrow','firework_rocket','glow_berries','nether_star','map'] },
];

export const ITEM_NAMES = {
  netherite_helmet: 'Незеритовый шлем', diamond_helmet: 'Алмазный шлем', iron_helmet: 'Железный шлем',
  golden_helmet: 'Золотой шлем', chainmail_helmet: 'Кольчужный шлем', leather_helmet: 'Кожаный шлем',
  turtle_helmet: 'Черепаший панцирь', carved_pumpkin: 'Вырезанная тыква',
  player_head: 'Голова игрока', zombie_head: 'Голова зомби', skeleton_skull: 'Череп скелета',
  creeper_head: 'Голова крипера', dragon_head: 'Голова дракона', piglin_head: 'Голова пиглина',
  netherite_chestplate: 'Незеритовый нагрудник', diamond_chestplate: 'Алмазный нагрудник',
  iron_chestplate: 'Железный нагрудник', golden_chestplate: 'Золотой нагрудник',
  chainmail_chestplate: 'Кольчужный нагрудник', leather_chestplate: 'Кожаный нагрудник', elytra: 'Элитры',
  netherite_leggings: 'Незеритовые штаны', diamond_leggings: 'Алмазные штаны',
  iron_leggings: 'Железные штаны', golden_leggings: 'Золотые штаны',
  chainmail_leggings: 'Кольчужные штаны', leather_leggings: 'Кожаные штаны',
  netherite_boots: 'Незеритовые ботинки', diamond_boots: 'Алмазные ботинки',
  iron_boots: 'Железные ботинки', golden_boots: 'Золотые ботинки',
  chainmail_boots: 'Кольчужные ботинки', leather_boots: 'Кожаные ботинки',
  netherite_sword: 'Незеритовый меч', diamond_sword: 'Алмазный меч',
  iron_sword: 'Железный меч', golden_sword: 'Золотой меч',
  stone_sword: 'Каменный меч', wooden_sword: 'Деревянный меч',
  netherite_axe: 'Незеритовый топор', diamond_axe: 'Алмазный топор', iron_axe: 'Железный топор',
  golden_axe: 'Золотой топор', stone_axe: 'Каменный топор',
  bow: 'Лук', crossbow: 'Арбалет', trident: 'Трезубец', mace: 'Булава',
  totem_of_undying: 'Тотем бессмертия', shield: 'Щит',
  torch: 'Факел', arrow: 'Стрела', spectral_arrow: 'Спектральная стрела',
  firework_rocket: 'Фейерверк', glow_berries: 'Светящиеся ягоды',
  stick: 'Палка', blaze_rod: 'Огненный стержень', nether_star: 'Звезда Нижнего мира',
  ender_pearl: 'Жемчуг Края', snowball: 'Снежок', egg: 'Яйцо', fire_charge: 'Огненный шар', map: 'Карта',
};

export const ENCHANTS = {
  armor: [
    { id: 'protection', name: 'Защита', max: 4 },
    { id: 'fire_protection', name: 'Огнезащита', max: 4 },
    { id: 'blast_protection', name: 'Взрывозащита', max: 4 },
    { id: 'projectile_protection', name: 'Защита от снарядов', max: 4 },
    { id: 'thorns', name: 'Шипы', max: 3 },
    { id: 'unbreaking', name: 'Неразрушимость', max: 3 },
    { id: 'mending', name: 'Починка', max: 1 },
    { id: 'binding_curse', name: 'Проклятие несъёмности', max: 1 },
    { id: 'vanishing_curse', name: 'Проклятие исчезновения', max: 1 },
  ],
  helmet_extra: [
    { id: 'respiration', name: 'Подводное дыхание', max: 3 },
    { id: 'aqua_affinity', name: 'Подводник', max: 1 },
  ],
  boots_extra: [
    { id: 'feather_falling', name: 'Невесомость', max: 4 },
    { id: 'depth_strider', name: 'Ходьба по воде', max: 3 },
    { id: 'frost_walker', name: 'Ледоход', max: 2 },
    { id: 'soul_speed', name: 'Скольжение по душам', max: 3 },
  ],
  sword: [
    { id: 'sharpness', name: 'Острота', max: 5 },
    { id: 'smite', name: 'Небесная кара (нежить)', max: 5 },
    { id: 'bane_of_arthropods', name: 'Бич членистоногих', max: 5 },
    { id: 'knockback', name: 'Отбрасывание', max: 2 },
    { id: 'fire_aspect', name: 'Заговор огня', max: 2 },
    { id: 'looting', name: 'Добыча', max: 3 },
    { id: 'sweeping_edge', name: 'Разящий клинок', max: 3 },
    { id: 'unbreaking', name: 'Неразрушимость', max: 3 },
    { id: 'mending', name: 'Починка', max: 1 },
  ],
  bow: [
    { id: 'power', name: 'Сила', max: 5 }, { id: 'punch', name: 'Отдача', max: 2 },
    { id: 'flame', name: 'Горящая стрела', max: 1 }, { id: 'infinity', name: 'Бесконечность', max: 1 },
    { id: 'unbreaking', name: 'Неразрушимость', max: 3 }, { id: 'mending', name: 'Починка', max: 1 },
  ],
  crossbow: [
    { id: 'quick_charge', name: 'Быстрая зарядка', max: 3 },
    { id: 'multishot', name: 'Мультивыстрел', max: 1 }, { id: 'piercing', name: 'Пронзание', max: 4 },
    { id: 'unbreaking', name: 'Неразрушимость', max: 3 }, { id: 'mending', name: 'Починка', max: 1 },
  ],
  trident: [
    { id: 'loyalty', name: 'Верность', max: 3 }, { id: 'impaling', name: 'Пронзающий', max: 5 },
    { id: 'riptide', name: 'Тягучесть', max: 3 }, { id: 'channeling', name: 'Молния', max: 1 },
    { id: 'unbreaking', name: 'Неразрушимость', max: 3 },
  ],
  mace: [
    { id: 'density', name: 'Плотность', max: 5 }, { id: 'breach', name: 'Пробивание', max: 4 },
    { id: 'wind_burst', name: 'Ветровой взрыв', max: 3 }, { id: 'smite', name: 'Небесная кара', max: 5 },
    { id: 'fire_aspect', name: 'Заговор огня', max: 2 }, { id: 'unbreaking', name: 'Неразрушимость', max: 3 },
  ],
  axe: [
    { id: 'sharpness', name: 'Острота', max: 5 }, { id: 'smite', name: 'Небесная кара', max: 5 },
    { id: 'bane_of_arthropods', name: 'Бич членистоногих', max: 5 },
    { id: 'efficiency', name: 'Эффективность', max: 5 },
    { id: 'unbreaking', name: 'Неразрушимость', max: 3 }, { id: 'mending', name: 'Починка', max: 1 },
  ],
};

export const TRIM_MATERIALS = [
  ['quartz','Кварц'],['iron','Железо'],['netherite','Незерит'],['redstone','Редстоун'],
  ['copper','Медь'],['gold','Золото'],['emerald','Изумруд'],['diamond','Алмаз'],
  ['lapis','Лазурит'],['amethyst','Аметист'],['resin','Смола'],
];
export const TRIM_PATTERNS = [
  ['sentry','Часовой'],['dune','Дюна'],['coast','Берег'],['wild','Дикарь'],
  ['ward','Страж'],['eye','Око'],['vex','Вредина'],['tide','Прилив'],
  ['snout','Рыло'],['rib','Ребро'],['spire','Шпиль'],['shaper','Ваятель'],
  ['silence','Тишина'],['raiser','Возвышение'],['host','Хозяин'],
  ['flow','Поток'],['bolt','Молния'],['wayfinder','Путеводный'],
];

export function canHaveTrim(itemId: string) {
  if (!itemId) return false;
  if (itemId === 'elytra') return false;
  return itemId.endsWith('_helmet') || itemId === 'turtle_helmet'
      || itemId.endsWith('_chestplate')
      || itemId.endsWith('_leggings')
      || itemId.endsWith('_boots');
}

export function enchantsForItem(itemId: string) {
  if (!itemId) return [];
  if (itemId.endsWith('_helmet') || itemId === 'turtle_helmet') return [...ENCHANTS.armor, ...ENCHANTS.helmet_extra];
  if (itemId.endsWith('_chestplate') || itemId === 'elytra') return [...ENCHANTS.armor];
  if (itemId.endsWith('_leggings')) return [...ENCHANTS.armor];
  if (itemId.endsWith('_boots')) return [...ENCHANTS.armor, ...ENCHANTS.boots_extra];
  if (itemId.endsWith('_sword')) return ENCHANTS.sword;
  if (itemId.endsWith('_axe')) return ENCHANTS.axe;
  if (itemId === 'bow') return ENCHANTS.bow;
  if (itemId === 'crossbow') return ENCHANTS.crossbow;
  if (itemId === 'trident') return ENCHANTS.trident;
  if (itemId === 'mace') return ENCHANTS.mace;
  return [];
}

export const EFFECTS = [
  ['speed','Скорость'],['slowness','Замедление'],['haste','Спешка'],['mining_fatigue','Усталость копания'],
  ['strength','Сила'],['weakness','Слабость'],['jump_boost','Прыгучесть'],['regeneration','Регенерация'],
  ['instant_health','Мгновенное лечение'],['instant_damage','Мгновенный урон'],
  ['poison','Отравление'],['wither','Иссушение'],
  ['resistance','Сопротивление урону'],['fire_resistance','Огнестойкость'],['water_breathing','Дыхание под водой'],
  ['invisibility','Невидимость'],['night_vision','Ночное зрение'],['blindness','Слепота'],
  ['nausea','Тошнота'],['hunger','Голод'],['saturation','Насыщение'],
  ['levitation','Левитация'],['glowing','Свечение'],['slow_falling','Медленное падение'],
  ['absorption','Поглощение'],['health_boost','Усиление здоровья'],['luck','Удача'],
  ['conduit_power','Мощь проводника'],['dolphins_grace','Грация дельфина'],
  ['hero_of_the_village','Герой деревни'],['darkness','Тьма'],['bad_omen','Дурное предзнаменование'],
];

export const NAME_COLORS = [
  ['', '— без цвета —'], ['white','белый'], ['gray','серый'], ['dark_gray','тёмно-серый'],
  ['black','чёрный'], ['red','красный'], ['dark_red','тёмно-красный'],
  ['gold','золотой'], ['yellow','жёлтый'], ['green','зелёный'], ['dark_green','тёмно-зелёный'],
  ['aqua','бирюзовый'], ['dark_aqua','тёмно-бирюзовый'], ['blue','синий'], ['dark_blue','тёмно-синий'],
  ['light_purple','розовый'], ['dark_purple','фиолетовый'],
];

export function isFireball(typeId: string) {
  return typeId === 'fireball';
}


export const ALL_MOBS = Object.fromEntries(MOB_GROUPS.flatMap((group) => group.mobs)) as Record<string, string>;
