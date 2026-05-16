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

export function createPreset(
  id: string,
  category: string,
  name: string,
  description: string,
  mobTypes: string[],
  fields: Record<string, SummonFieldValue> = {},
): SummonTemplateLike {
  const presetFields: Record<string, SummonFieldValue> = {};
  mobTypes.forEach((mobType, idx) => {
    presetFields[`${idx}-mob`] = mobType;
    presetFields[`${idx}-persist`] = true;
    presetFields[`${idx}-name-visible`] = true;
  });
  return {
    id,
    category,
    name,
    description,
    version: 1,
    mobOrder: mobTypes.map(mobType => ({ mobType })),
    fields: { ...presetFields, ...fields },
    enabled: true,
  };
}

export const SUMMON_PRESETS_DEFAULT = [
  createPreset('skeleton-rider-spider', 'С пассажирами', 'Скелет-наездник', 'Классика: скелет сидит на пауке.', ['spider', 'skeleton'], {
    '1-slot-mainhand': 'bow',
    '1-ench-mainhand-power': true,
    '1-enchlvl-mainhand-power': 2,
  }),
  createPreset('baby-zombie-chicken', 'С пассажирами', 'Зомби-наездник', 'Маленький зомби верхом на курице.', ['chicken', 'zombie'], {
    '1-baby': true,
    '1-slot-head': 'iron_helmet',
    '1-slot-mainhand': 'iron_sword',
  }),
  createPreset('villager-on-pig', 'С пассажирами', 'Всадник на свинье', 'Житель верхом на свинье для шуток и карт.', ['pig', 'villager'], {
    '1-name': 'Пассажир',
    '1-noai': true,
  }),
  createPreset('pillager-ravager', 'С пассажирами', 'Разбойник на звере', 'Разбойник на разорителе для арены или рейда.', ['ravager', 'pillager'], {
    '0-health': '80',
    '1-slot-mainhand': 'crossbow',
    '1-ench-mainhand-quick_charge': true,
    '1-enchlvl-mainhand-quick_charge': 2,
  }),
  createPreset('witch-on-spider', 'С пассажирами', 'Ведьма на пауке', 'Быстрый и неприятный противник: ведьма сидит на пауке.', ['spider', 'witch'], {
    '0-speed': '0.35',
    '1-health': '40',
  }),
  createPreset('creeper-delivery', 'С пассажирами', 'Крипер-доставка', 'Крипер в вагонетке для ловушек и карт.', ['minecart', 'creeper'], {
    '1-name': 'Доставка',
    '1-name-color': 'green',
  }),
  createPreset('slime-tower', 'С пассажирами', 'Башня из слизней', 'Три слизня друг на друге.', ['slime', 'slime', 'slime'], {
    '0-scale': '2',
    '1-scale': '1.5',
    '2-scale': '1',
  }),
  createPreset('mob-tower', 'С пассажирами', 'Башня из мобов', 'Зомби, скелет и крипер в одной высокой стопке.', ['zombie', 'skeleton', 'creeper'], {
    '1-slot-mainhand': 'bow',
    '2-name': 'Верхушка',
    '2-name-color': 'green',
  }),
  createPreset('armored-zombie', 'Боевые', 'Бронированный зомби', 'Зомби в незеритовой броне с полностью зачарованным мечом.', ['zombie'], {
    '0-name': 'Страж',
    '0-name-color': 'dark_green',
    '0-health': '40',
    '0-armor': '20',
    '0-slot-head': 'netherite_helmet',
    '0-ench-head-protection': true,
    '0-enchlvl-head-protection': 4,
    '0-ench-head-fire_protection': true,
    '0-enchlvl-head-fire_protection': 4,
    '0-ench-head-blast_protection': true,
    '0-enchlvl-head-blast_protection': 4,
    '0-ench-head-projectile_protection': true,
    '0-enchlvl-head-projectile_protection': 4,
    '0-ench-head-thorns': true,
    '0-enchlvl-head-thorns': 3,
    '0-ench-head-unbreaking': true,
    '0-enchlvl-head-unbreaking': 3,
    '0-ench-head-mending': true,
    '0-enchlvl-head-mending': 1,
    '0-ench-head-binding_curse': true,
    '0-enchlvl-head-binding_curse': 1,
    '0-ench-head-vanishing_curse': true,
    '0-enchlvl-head-vanishing_curse': 1,
    '0-ench-head-respiration': true,
    '0-enchlvl-head-respiration': 3,
    '0-ench-head-aqua_affinity': true,
    '0-enchlvl-head-aqua_affinity': 1,
    '0-slot-chest': 'netherite_chestplate',
    '0-ench-chest-protection': true,
    '0-enchlvl-chest-protection': 4,
    '0-ench-chest-fire_protection': true,
    '0-enchlvl-chest-fire_protection': 4,
    '0-ench-chest-blast_protection': true,
    '0-enchlvl-chest-blast_protection': 4,
    '0-ench-chest-projectile_protection': true,
    '0-enchlvl-chest-projectile_protection': 4,
    '0-ench-chest-thorns': true,
    '0-enchlvl-chest-thorns': 3,
    '0-ench-chest-unbreaking': true,
    '0-enchlvl-chest-unbreaking': 3,
    '0-ench-chest-mending': true,
    '0-enchlvl-chest-mending': 1,
    '0-ench-chest-binding_curse': true,
    '0-enchlvl-chest-binding_curse': 1,
    '0-ench-chest-vanishing_curse': true,
    '0-enchlvl-chest-vanishing_curse': 1,
    '0-slot-legs': 'netherite_leggings',
    '0-ench-legs-protection': true,
    '0-enchlvl-legs-protection': 4,
    '0-ench-legs-fire_protection': true,
    '0-enchlvl-legs-fire_protection': 4,
    '0-ench-legs-blast_protection': true,
    '0-enchlvl-legs-blast_protection': 4,
    '0-ench-legs-projectile_protection': true,
    '0-enchlvl-legs-projectile_protection': 4,
    '0-ench-legs-thorns': true,
    '0-enchlvl-legs-thorns': 3,
    '0-ench-legs-unbreaking': true,
    '0-enchlvl-legs-unbreaking': 3,
    '0-ench-legs-mending': true,
    '0-enchlvl-legs-mending': 1,
    '0-ench-legs-binding_curse': true,
    '0-enchlvl-legs-binding_curse': 1,
    '0-ench-legs-vanishing_curse': true,
    '0-enchlvl-legs-vanishing_curse': 1,
    '0-slot-feet': 'netherite_boots',
    '0-ench-feet-protection': true,
    '0-enchlvl-feet-protection': 4,
    '0-ench-feet-fire_protection': true,
    '0-enchlvl-feet-fire_protection': 4,
    '0-ench-feet-blast_protection': true,
    '0-enchlvl-feet-blast_protection': 4,
    '0-ench-feet-projectile_protection': true,
    '0-enchlvl-feet-projectile_protection': 4,
    '0-ench-feet-thorns': true,
    '0-enchlvl-feet-thorns': 3,
    '0-ench-feet-unbreaking': true,
    '0-enchlvl-feet-unbreaking': 3,
    '0-ench-feet-mending': true,
    '0-enchlvl-feet-mending': 1,
    '0-ench-feet-binding_curse': true,
    '0-enchlvl-feet-binding_curse': 1,
    '0-ench-feet-vanishing_curse': true,
    '0-enchlvl-feet-vanishing_curse': 1,
    '0-ench-feet-feather_falling': true,
    '0-enchlvl-feet-feather_falling': 4,
    '0-ench-feet-depth_strider': true,
    '0-enchlvl-feet-depth_strider': 3,
    '0-ench-feet-frost_walker': true,
    '0-enchlvl-feet-frost_walker': 2,
    '0-ench-feet-soul_speed': true,
    '0-enchlvl-feet-soul_speed': 3,
    '0-slot-mainhand': 'netherite_sword',
    '0-ench-mainhand-sharpness': true,
    '0-enchlvl-mainhand-sharpness': 5,
    '0-ench-mainhand-smite': true,
    '0-enchlvl-mainhand-smite': 5,
    '0-ench-mainhand-bane_of_arthropods': true,
    '0-enchlvl-mainhand-bane_of_arthropods': 5,
    '0-ench-mainhand-knockback': true,
    '0-enchlvl-mainhand-knockback': 2,
    '0-ench-mainhand-fire_aspect': true,
    '0-enchlvl-mainhand-fire_aspect': 2,
    '0-ench-mainhand-looting': true,
    '0-enchlvl-mainhand-looting': 3,
    '0-ench-mainhand-sweeping_edge': true,
    '0-enchlvl-mainhand-sweeping_edge': 3,
    '0-ench-mainhand-unbreaking': true,
    '0-enchlvl-mainhand-unbreaking': 3,
    '0-ench-mainhand-mending': true,
    '0-enchlvl-mainhand-mending': 1,
  }),
  createPreset('skeleton-sniper', 'Боевые', 'Скелет-снайпер', 'Скелет с сильным зачарованным луком.', ['skeleton'], {
    '0-name': 'Снайпер',
    '0-name-color': 'gray',
    '0-slot-mainhand': 'bow',
    '0-ench-mainhand-power': true,
    '0-enchlvl-mainhand-power': 5,
    '0-ench-mainhand-punch': true,
    '0-enchlvl-mainhand-punch': 2,
    '0-eff-glowing': true,
  }),
  createPreset('pillager-miniboss', 'Боевые', 'Мини-босс разбойников', 'Капитан с арбалетом, здоровьем и тегом boss.', ['pillager'], {
    '0-name': 'Капитан рейда',
    '0-name-color': 'gold',
    '0-name-bold': true,
    '0-health': '80',
    '0-armor': '8',
    '0-boss': true,
    '0-slot-mainhand': 'crossbow',
    '0-ench-mainhand-quick_charge': true,
    '0-enchlvl-mainhand-quick_charge': 3,
    '0-ench-mainhand-piercing': true,
    '0-enchlvl-mainhand-piercing': 4,
  }),
  createPreset('tank-zombie', 'Боевые', 'Танк', 'Медленный, очень живучий зомби в незеритовой броне.', ['zombie'], {
    '0-name': 'Танк',
    '0-name-color': 'dark_red',
    '0-name-bold': true,
    '0-health': '160',
    '0-speed': '0.12',
    '0-armor': '24',
    '0-attack': '16',
    '0-kb': '0.8',
    '0-slot-head': 'netherite_helmet',
    '0-slot-chest': 'netherite_chestplate',
    '0-slot-legs': 'netherite_leggings',
    '0-slot-feet': 'netherite_boots',
    '0-slot-mainhand': 'netherite_axe',
  }),
  createPreset('cat-on-chicken', 'Смешные', 'Кот на курице', 'Кот едет на курице.', ['chicken', 'cat']),
  createPreset('villager-on-llama', 'Смешные', 'Житель на ламе', 'Житель верхом на ламе.', ['llama', 'villager'], {
    '1-noai': true,
  }),
  createPreset('bee-courier', 'Смешные', 'Пчелиный курьер', 'Пчела несёт маленькую невидимую стойку с именем.', ['bee', 'armor_stand'], {
    '1-name': 'Посылка',
    '1-name-color': 'yellow',
    '1-invisible': true,
    '1-nogravity': true,
    '1-noai': true,
  }),
  createPreset('dinnerbone-zombie', 'Смешные', 'Перевёрнутый моб', 'Зомби с именем Dinnerbone.', ['zombie'], {
    '0-name': 'Dinnerbone',
    '0-name-color': 'white',
  }),
  createPreset('invisible-name-stand', 'Для карт', 'Невидимая стойка с именем', 'Стойка без гравитации с видимым названием.', ['armor_stand'], {
    '0-name': 'Точка',
    '0-name-color': 'aqua',
    '0-invisible': true,
    '0-nogravity': true,
    '0-noai': true,
  }),
  createPreset('map-poi', 'Для карт', 'Точка интереса', 'Светящаяся невидимая стойка для отметок на карте.', ['armor_stand'], {
    '0-name': 'Место',
    '0-name-color': 'gold',
    '0-name-bold': true,
    '0-invisible': true,
    '0-nogravity': true,
    '0-glow': true,
    '0-noai': true,
  }),
  createPreset('decorative-npc', 'Для карт', 'Декоративный NPC', 'Житель с именем, который стоит на месте.', ['villager'], {
    '0-name': 'NPC',
    '0-name-color': 'yellow',
    '0-noai': true,
    '0-silent': true,
  }),
  createPreset('guard-golem', 'Для карт', 'Охранник', 'Железный голем с именем для входа или базы.', ['iron_golem'], {
    '0-name': 'Охранник',
    '0-name-color': 'gray',
    '0-health': '120',
    '0-attack': '18',
  }),
];

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
