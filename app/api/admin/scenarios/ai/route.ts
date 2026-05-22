import { requireAdminResponse } from "../../../../server/admin-guard";
import { getDatabaseUrlStatus } from "../../../../server/db";
import { listLibraryItems } from "../../../../server/library-items";
import { listLibraryMobs } from "../../../../server/library-mobs";
import { applyScenarioAiPlan, type ScenarioAiPlan } from "../../../../server/scenario-ai";
import { listScenarios } from "../../../../server/scenarios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPENAI_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4.1-mini";
const PROMPT_CACHE_KEY = "mc-commands-ai-scenarios";

type PromptCacheRetention = "in_memory" | "24h";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["actions"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    scenarioType: { type: "string", enum: ["items", "mobs", "kit", "mixed"] },
    notes: { type: "array", items: { type: "string" } },
    actions: {
      type: "array",
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type"],
        properties: {
          type: { type: "string", enum: ["give_item", "equip_player", "summon_mob", "run_scenario"] },
          itemId: { type: "string" },
          itemName: { type: "string" },
          mobId: { type: "string" },
          mobName: { type: "string" },
          scenarioId: { type: "string" },
          quantity: { type: "integer" },
          slot: { type: "string" },
          spawn: {
            type: "object",
            additionalProperties: false,
            properties: {
              type: { type: "string", enum: ["near-player", "player", "coordinates"] },
              coordinates: {
                type: "object",
                additionalProperties: false,
                properties: {
                  x: { type: "string" },
                  y: { type: "string" },
                  z: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function requireDatabaseResponse() {
  if (!getDatabaseUrlStatus().configured) {
    return Response.json({ ok: false, error: "Хранилище сценариев не настроено" }, { status: 503 });
  }

  return null;
}

function promptCacheRetentionOptions(): { prompt_cache_retention?: PromptCacheRetention } {
  const retention = process.env.OPENAI_PROMPT_CACHE_RETENTION;
  if (retention === "in_memory" || retention === "24h") return { prompt_cache_retention: retention };
  return {};
}

function extractOutputText(json: unknown) {
  if (typeof json !== "object" || json === null) return "";
  const direct = (json as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;
  const output = (json as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  return output.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) return [];
    return content.flatMap((part) => {
      if (typeof part !== "object" || part === null) return [];
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? [text] : [];
    });
  }).join("");
}

function coercePlan(value: unknown): ScenarioAiPlan {
  if (typeof value !== "object" || value === null) throw new Error("AI-помощник вернул не JSON-объект.");
  const plan = value as ScenarioAiPlan;
  return {
    name: typeof plan.name === "string" ? plan.name : undefined,
    description: typeof plan.description === "string" ? plan.description : undefined,
    scenarioType: typeof plan.scenarioType === "string" ? plan.scenarioType : undefined,
    actions: Array.isArray(plan.actions) ? plan.actions : [],
    notes: Array.isArray(plan.notes) ? plan.notes : [],
  };
}

function compactList(entries: { id: string; name: string; description?: string }[]) {
  return entries
    .slice(0, 250)
    .map((entry) => `${entry.id}=${entry.name}${entry.description ? ` (${entry.description.slice(0, 80)})` : ""}`)
    .join("; ");
}

function buildSystemPrompt(params: {
  items: { id: string; name: string; description: string }[];
  mobs: { id: string; name: string; description: string }[];
  scenarios: { id: string; name: string }[];
}) {
  return [
    "Ты AI-помощник админки русскоязычного генератора Minecraft-команд.",
    "Нужно заполнить черновик сценария, но НЕ выполнять его и НЕ сохранять.",
    "Верни только JSON по схеме. Используй только существующие ID из библиотеки. Не выдумывай itemId, mobId или scenarioId.",
    "Если подходящего предмета или моба нет в библиотеке, не добавляй действие с выдуманным ID; добавь notes с предложением создать элемент библиотеки.",
    "Типы сценариев: items=Набор предметов, mobs=Отряд мобов, kit=Комплект игрока, mixed=смешанный сценарий.",
    "Действия: give_item(itemId,quantity), equip_player(itemId,slot), summon_mob(mobId,quantity,spawn), run_scenario(scenarioId).",
    "Слоты equip_player: armor.head, armor.chest, armor.legs, armor.feet, weapon.mainhand, weapon.offhand.",
    "spawn для summon_mob: near-player, player или coordinates с x/y/z строками. Если место не указано, используй near-player.",
    "Количество ограничивай 1-64. Для комплекта игрока используй equip_player, а дополнительные предметы инвентаря добавляй через give_item.",
    `Предметы библиотеки: ${compactList(params.items)}.`,
    `Мобы библиотеки: ${compactList(params.mobs)}.`,
    `Существующие сценарии для вложения, если пользователь явно просит: ${compactList(params.scenarios)}.`,
  ].join("\n");
}

async function requestAiPlan(apiKey: string, prompt: string, systemPrompt: string): Promise<ScenarioAiPlan> {
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(35000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      max_output_tokens: 1600,
      prompt_cache_key: PROMPT_CACHE_KEY,
      ...promptCacheRetentionOptions(),
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "minecraft_admin_scenario_plan",
          strict: false,
          schema: responseSchema,
        },
      },
    }),
  });

  const json = await response.json();
  if (!response.ok) {
    const message = typeof json?.error?.message === "string" ? json.error.message : "AI-помощник не вернул успешный ответ.";
    throw new Error(message);
  }

  const text = extractOutputText(json);
  if (!text) throw new Error("AI-помощник вернул пустой ответ.");
  return coercePlan(JSON.parse(text));
}

export async function POST(request: Request) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const databaseError = requireDatabaseResponse();
  if (databaseError) return databaseError;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return Response.json({ ok: false, error: "OPENAI_API_KEY не настроен на сервере." }, { status: 503 });

  const body = asRecord(await request.json().catch(() => null));
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 3) return Response.json({ ok: false, error: "Опиши сценарий словами." }, { status: 400 });
  if (prompt.length > 1500) return Response.json({ ok: false, error: "Описание слишком длинное. Сократи его до 1500 символов." }, { status: 400 });

  try {
    const [items, mobs, scenarios] = await Promise.all([
      listLibraryItems(),
      listLibraryMobs({ admin: true }),
      listScenarios(),
    ]);
    const plan = await requestAiPlan(apiKey, prompt, buildSystemPrompt({ items, mobs, scenarios }));
    const result = applyScenarioAiPlan(plan, { items, mobs, scenarios });
    return Response.json({ ok: true, draft: result.draft, notes: result.notes });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Не получилось заполнить сценарий." },
      { status: 502 },
    );
  }
}
