import type { Ruleset } from '../types';
import { hongKongRuleset } from './hongkong';

// Registry of all available rulesets
export const rulesets: Record<string, Ruleset> = {
  hongkong: hongKongRuleset,
};

export function getRuleset(id: string): Ruleset {
  const ruleset = rulesets[id];
  if (!ruleset) {
    throw new Error(`Unknown ruleset: ${id}`);
  }
  return ruleset;
}

export function getAvailableRulesets(): Array<{ id: string; name: string }> {
  return Object.values(rulesets).map(r => ({ id: r.id, name: r.name }));
}

export { hongKongRuleset };
