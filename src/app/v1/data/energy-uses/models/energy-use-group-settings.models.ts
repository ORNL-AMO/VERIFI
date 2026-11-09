import type { IdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import type { EnergyUseGroupSettings } from '@data/account-workspace/handlers/energy-use-command.models';
import { ConflictChoices, reconcileFields } from '@app/v1/data/editing/draft-reconciliation';

export function normalizeGroupSettings(value: EnergyUseGroupSettings): EnergyUseGroupSettings {
  return { name: value.name.trim(), notes: value.notes.trim() };
}
export function groupSettings(group: Readonly<IdbFacilityEnergyUseGroup>): EnergyUseGroupSettings {
  return normalizeGroupSettings({ name: group.name ?? '', notes: group.notes ?? '' });
}
export function reconcileGroupSettings(base: EnergyUseGroupSettings, local: EnergyUseGroupSettings, saved: EnergyUseGroupSettings, choices?: ConflictChoices) {
  return reconcileFields(base, local, saved, { choices });
}
