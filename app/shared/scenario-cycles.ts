type ScenarioActionLike = {
  type: string;
  scenarioId?: string;
};

export type ScenarioCycleCheckEntry = {
  id: string;
  name?: string;
  actions: ScenarioActionLike[];
};

function scenarioLabel(scenario: ScenarioCycleCheckEntry | undefined, id: string) {
  return scenario?.name || id;
}

export function getScenarioCyclePath(candidate: ScenarioCycleCheckEntry, scenarios: ScenarioCycleCheckEntry[]) {
  if (!candidate.id) return null;

  const scenarioMap = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  scenarioMap.set(candidate.id, candidate);

  function visit(id: string, path: string[]): string[] | null {
    const existingIndex = path.indexOf(id);
    if (existingIndex >= 0) return [...path.slice(existingIndex), id];

    const scenario = scenarioMap.get(id);
    if (!scenario) return null;

    for (const action of scenario.actions) {
      if (action.type !== "run_scenario" || !action.scenarioId) continue;
      const cycle = visit(action.scenarioId, [...path, id]);
      if (cycle) return cycle;
    }

    return null;
  }

  const cycle = visit(candidate.id, []);
  return cycle?.map((id) => scenarioLabel(scenarioMap.get(id), id)) || null;
}

export function assertScenarioHasNoCycles(candidate: ScenarioCycleCheckEntry, scenarios: ScenarioCycleCheckEntry[]) {
  const cycle = getScenarioCyclePath(candidate, scenarios);
  if (cycle) {
    throw new Error(`Найден циклический запуск сценариев: ${cycle.join(" / ")}`);
  }
}

export function canReferenceScenario(currentScenarioId: string, targetScenarioId: string, scenarios: ScenarioCycleCheckEntry[]) {
  if (!targetScenarioId) return false;
  if (!currentScenarioId) return true;
  if (currentScenarioId === targetScenarioId) return false;

  return !getScenarioCyclePath(
    {
      id: currentScenarioId,
      actions: [{ type: "run_scenario", scenarioId: targetScenarioId }],
    },
    scenarios,
  );
}
