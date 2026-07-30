import type { AnalysisGroup, JStatRegressionModel } from 'src/app/models/analysis';
import type { IdbFacility } from 'src/app/models/idbModels/facility';

export const ORPHANED_MODEL_RECOVERY_NOTE =
  'Recovered as a user-defined model because the saved generated-model details were unavailable.';

export type FiscalYearSettings = Pick<IdbFacility, 'fiscalYear' | 'fiscalYearMonth' | 'fiscalYearCalendarEnd'>;

export interface UserDefinedModelDateRange {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

export interface AnalysisGroupModelNormalization {
  group: AnalysisGroup;
  isChanged: boolean;
  recoveredAsUserDefined: boolean;
}

export function getSelectedRegressionModel(group: AnalysisGroup): JStatRegressionModel | undefined {
  if (!group.selectedModelId) {
    return undefined;
  }
  return group.models?.find(model => model.modelId === group.selectedModelId);
}

export function findEquivalentRegressionModel(
  previousModel: JStatRegressionModel | undefined,
  generatedModels: Array<JStatRegressionModel>
): JStatRegressionModel | undefined {
  if (!previousModel) {
    return undefined;
  }

  const previousPredictorIds = getSortedPredictorIds(previousModel);
  return generatedModels.find(model => {
    return model.modelYear === previousModel.modelYear
      && arraysEqual(getSortedPredictorIds(model), previousPredictorIds);
  });
}

export function getUserDefinedModelDateRange(
  modelYear: number | undefined,
  facility: FiscalYearSettings | undefined,
  fallbackYear: number | undefined
): UserDefinedModelDateRange | undefined {
  const effectiveYear = modelYear ?? fallbackYear;
  if (effectiveYear == undefined) {
    return undefined;
  }

  if (!facility || facility.fiscalYear === 'calendarYear') {
    return {
      startMonth: 0,
      startYear: effectiveYear,
      endMonth: 11,
      endYear: effectiveYear
    };
  }

  const fiscalYearMonth = facility.fiscalYearMonth ?? 0;
  const startYear = facility.fiscalYearCalendarEnd ? effectiveYear - 1 : effectiveYear;
  const exclusiveEndYear = facility.fiscalYearCalendarEnd ? effectiveYear : effectiveYear + 1;
  const inclusiveEndDate = new Date(exclusiveEndYear, fiscalYearMonth - 1, 1);

  return {
    startMonth: fiscalYearMonth,
    startYear,
    endMonth: inclusiveEndDate.getMonth(),
    endYear: inclusiveEndDate.getFullYear()
  };
}

export function convertOrphanedGeneratedModelToUserDefined(
  group: AnalysisGroup,
  facility: FiscalYearSettings | undefined,
  fallbackYear: number | undefined
): AnalysisGroup {
  const dateRange = getUserDefinedModelDateRange(group.regressionModelYear, facility, fallbackYear);
  const regressionModelNotes = appendRecoveryNote(group.regressionModelNotes);

  return {
    ...group,
    isGeneratedModel: false,
    selectedModelId: undefined,
    models: undefined,
    dateModelsGenerated: undefined,
    regressionModelNotes,
    ...(dateRange ? {
      regressionModelStartMonth: dateRange.startMonth,
      regressionStartYear: dateRange.startYear,
      regressionModelEndMonth: dateRange.endMonth,
      regressionEndYear: dateRange.endYear
    } : {}),
    predictorVariables: group.predictorVariables.map(variable => ({ ...variable }))
  };
}

export function normalizeAnalysisGroupModelStorage(
  group: AnalysisGroup,
  facility: FiscalYearSettings | undefined,
  fallbackYear: number | undefined
): AnalysisGroupModelNormalization {
  if (group.analysisType !== 'regression' || !group.isGeneratedModel) {
    return { group, isChanged: false, recoveredAsUserDefined: false };
  }

  const selectedModel = getSelectedRegressionModel(group);
  if (selectedModel) {
    if (group.models?.length === 1 && group.models[0] === selectedModel) {
      return { group, isChanged: false, recoveredAsUserDefined: false };
    }
    return {
      group: { ...group, models: [selectedModel] },
      isChanged: true,
      recoveredAsUserDefined: false
    };
  }

  if (group.selectedModelId) {
    return {
      group: convertOrphanedGeneratedModelToUserDefined(group, facility, fallbackYear),
      isChanged: true,
      recoveredAsUserDefined: true
    };
  }

  if (group.models?.length) {
    return {
      group: { ...group, models: undefined },
      isChanged: true,
      recoveredAsUserDefined: false
    };
  }

  return { group, isChanged: false, recoveredAsUserDefined: false };
}

function getSortedPredictorIds(model: JStatRegressionModel): Array<string> {
  return (model.predictorVariables ?? [])
    .map(variable => variable.id)
    .filter(id => id != undefined)
    .sort();
}

function arraysEqual(first: Array<string>, second: Array<string>): boolean {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function appendRecoveryNote(existingNotes: string | undefined): string {
  if (!existingNotes) {
    return ORPHANED_MODEL_RECOVERY_NOTE;
  }
  if (existingNotes.includes(ORPHANED_MODEL_RECOVERY_NOTE)) {
    return existingNotes;
  }
  return `${existingNotes}\n${ORPHANED_MODEL_RECOVERY_NOTE}`;
}
