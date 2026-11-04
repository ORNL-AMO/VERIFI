import { IdbPredictor } from '@data/models/idbModels/predictor';
import { ConflictChoices, DraftMerge, reconcileFields } from '@app/v1/data/editing/draft-reconciliation';

/** Editable Standard predictor settings, independent of forms and stored identity. */
export interface StandardPredictorSettings {
  readonly name: string;
  readonly unit: string;
  readonly description: string;
  readonly production: boolean;
  readonly noLongerInUse: boolean;
  readonly stopMonth: string;
  readonly canBeNegative: boolean;
  readonly ignoreDateStatusChecks: boolean;
}

export interface StandardPredictorSettingsIdentity {
  readonly accountGuid: string;
  readonly facilityGuid: string;
  readonly predictorGuid: string;
}

export function standardPredictorSettings(predictor: IdbPredictor): StandardPredictorSettings {
  const year = predictor.noLongerInUseYear;
  const month = predictor.noLongerInUseMonth;
  return normalizeStandardPredictorSettings({
    name: predictor.name ?? '',
    unit: predictor.unit ?? '',
    description: predictor.description ?? '',
    production: !!predictor.production,
    noLongerInUse: !!predictor.noLongerInUse,
    stopMonth: Number.isInteger(year) && Number.isInteger(month) && month >= 0 && month <= 11
      ? `${year}-${String(month + 1).padStart(2, '0')}` : '',
    canBeNegative: !!predictor.canBeNegative,
    ignoreDateStatusChecks: !!predictor.ignoreDateStatusChecks
  });
}

export function normalizeStandardPredictorSettings(value: StandardPredictorSettings): StandardPredictorSettings {
  return { ...value, name: value.name.trim(), unit: value.unit.trim(), description: value.description.trim(),
    stopMonth: value.noLongerInUse ? value.stopMonth : '' };
}

export function validStandardPredictorSettings(value: StandardPredictorSettings): boolean {
  return !!value.name.trim() && value.name.trim().length <= 100 && value.unit.trim().length <= 100
    && (!value.noLongerInUse || !value.stopMonth || !!parsePredictorStopMonth(value.stopMonth));
}

export function applyStandardPredictorSettings(predictor: IdbPredictor, settings: StandardPredictorSettings): IdbPredictor {
  const value = normalizeStandardPredictorSettings(settings);
  const stop = value.noLongerInUse ? parsePredictorStopMonth(value.stopMonth) : undefined;
  return { ...structuredClone(predictor), name: value.name, unit: value.unit || undefined,
    description: value.description || undefined, production: value.production, predictorType: 'Standard',
    noLongerInUse: value.noLongerInUse, noLongerInUseYear: stop?.year, noLongerInUseMonth: stop?.month,
    canBeNegative: value.canBeNegative, ignoreDateStatusChecks: value.ignoreDateStatusChecks };
}

export function reconcileStandardPredictorSettings(
  base: StandardPredictorSettings,
  local: StandardPredictorSettings,
  saved: StandardPredictorSettings,
  choices?: ConflictChoices
): DraftMerge<StandardPredictorSettings> {
  return reconcileFields(base, local, saved, { choices, groups: [
    { id: 'name', label: 'Name', keys: ['name'] },
    { id: 'unit', label: 'Unit', keys: ['unit'] },
    { id: 'description', label: 'Description', keys: ['description'] },
    { id: 'production', label: 'Is Production', keys: ['production'] },
    { id: 'stopDate', label: 'No longer in use and stop month', keys: ['noLongerInUse', 'stopMonth'] },
    { id: 'canBeNegative', label: 'Allow negative values', keys: ['canBeNegative'] },
    { id: 'ignoreDateStatusChecks', label: 'Ignore date status checks', keys: ['ignoreDateStatusChecks'] }
  ] });
}

export function parsePredictorStopMonth(value: string): { year: number; month: number } | undefined {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year > 0 && month >= 1 && month <= 12 ? { year, month: month - 1 } : undefined;
}
