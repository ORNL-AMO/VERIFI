import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { getUnitFromMeter } from '@domain/calculations/calanderization/calanderizationHelpers';
import type { SettingBinding, VisualizationDefinition, VisualizationSource } from './visualization-definition';
import { resolveVisualizationFacilities } from './visualization-facilities';
import { resolveUtilitySelection, utilityOwner } from './utility/utility-selection';
import { analysisUnit } from './analysis/facility-analysis-source';
import { resolveReportingAnalysis } from './analysis/reporting-analysis';

export function visualizationSourceQuantities(definition: VisualizationDefinition, source: VisualizationSource, snapshot: AccountWorkspaceSnapshot): readonly string[] {
  if (source.kind === 'energy-use' || source.kind === 'utility' && source.measure === 'energy') return ['energy'];
  if (source.kind === 'predictor' || source.kind === 'utility' && (source.measure === 'cost' || source.measure === 'charge' || source.measure.endsWith('emissions'))) return [];
  if (source.kind === 'analysis') {
    if (source.mode !== 'result' || !['actual', 'calculated'].includes(source.measure)) return [];
    const reporting = source.reporting && resolveReportingAnalysis(source.reporting, snapshot);
    const analysis = reporting?.state === 'ready' ? reporting.analysis
      : [...snapshot.facilityAnalyses, ...snapshot.accountAnalyses].find(item => item.guid === source.analysisGuid);
    const quantity = analysis && new ConvertValue(undefined, '', '').getUnit(analysisUnit(analysis, source.measure))?.measure;
    return quantity ? [quantity] : [];
  }
  if (source.kind !== 'utility') return [];
  const scope = resolveVisualizationFacilities(definition, snapshot.facilities).scope, owner = utilityOwner(snapshot, scope);
  const quantities = new Set(resolveUtilitySelection(snapshot, scope, source).meters.map(meter => {
    try { return owner ? new ConvertValue(undefined, '', '').getUnit(getUnitFromMeter(meter, owner))?.measure : undefined; } catch { return undefined; }
  }));
  return [...quantities].filter((quantity): quantity is string => !!quantity);
}

export function visualizationSourceQuantity(definition: VisualizationDefinition, source: VisualizationSource, snapshot: AccountWorkspaceSnapshot): string | undefined {
  const quantities = visualizationSourceQuantities(definition, source, snapshot);
  return quantities.length === 1 ? quantities[0] : undefined;
}

export function visualizationOwnerUnit(definition: VisualizationDefinition, snapshot: AccountWorkspaceSnapshot, quantity: string): string | undefined {
  const owner = utilityOwner(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope);
  if (!owner) return undefined;
  return quantity === 'energy' ? owner.energyUnit : quantity === 'volume' ? owner.volumeLiquidUnit : undefined;
}

/** New Analysis selections start with one explicit shared unit and their saved basis. */
export function initializeAnalysisDisplaySettings(definition: VisualizationDefinition, snapshot: AccountWorkspaceSnapshot): VisualizationDefinition {
  const units = { ...definition.displaySettings?.units };
  let energyTreatment = definition.displaySettings?.energyTreatment;
  for (const source of definition.sources) {
    if (source.kind !== 'analysis' || source.mode !== 'result') continue;
    const analysis = [...snapshot.facilityAnalyses, ...snapshot.accountAnalyses].find(item => item.guid === source.analysisGuid);
    if (!analysis) continue;
    const quantity = visualizationSourceQuantity(definition, source, snapshot);
    if (quantity && !units[quantity]) units[quantity] = { kind: 'pinned', value: analysisUnit(analysis, source.measure) };
    if (analysis.analysisCategory === 'energy' && !energyTreatment) energyTreatment = { kind: 'pinned', value: analysis.energyIsSource ? 'source' : 'site' };
  }
  return { ...definition, displaySettings: { ...definition.displaySettings, ...(Object.keys(units).length ? { units } : {}), ...(energyTreatment ? { energyTreatment } : {}) } };
}

/** Compile chart-wide display settings into provider requests without changing saved inputs. */
export function projectVisualizationDisplaySettings(definition: VisualizationDefinition, snapshot: AccountWorkspaceSnapshot): VisualizationDefinition {
  if (!definition.displaySettings) return definition;
  const owner = utilityOwner(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope);
  return { ...definition, sources: definition.sources.map(source => {
    const quantity = visualizationSourceQuantity(definition, source, snapshot);
    const quantityUnits = source.kind === 'utility' && source.measure === 'consumption' ? Object.fromEntries(visualizationSourceQuantities(definition, source, snapshot).flatMap(quantity => {
      const binding = definition.displaySettings?.units?.[quantity];
      const value = binding?.kind === 'pinned' ? binding.value : binding?.kind === 'owner' ? visualizationOwnerUnit(definition, snapshot, quantity) : undefined;
      return value ? [[quantity, value]] : [];
    })) : undefined;
    const binding = quantity && definition.displaySettings!.units?.[quantity];
    const ownerUnit = quantity && visualizationOwnerUnit(definition, snapshot, quantity);
    const unit: SettingBinding<string> | undefined = binding?.kind === 'pinned' ? binding : binding?.kind === 'owner' && ownerUnit ? { kind: 'pinned', value: ownerUnit } : undefined;
    const energy = source.kind === 'utility' && source.measure === 'energy' || source.kind === 'analysis' && quantity === 'energy';
    const treatment = energy && definition.displaySettings!.energyTreatment;
    return { ...source, settings: { ...source.settings, ...(quantityUnits && Object.keys(quantityUnits).length ? { quantityUnits } : {}), ...(unit ? { unit } : {}),
      ...(treatment ? { energyTreatment: treatment.kind === 'pinned' ? treatment : owner ? { kind: 'pinned' as const, value: owner.energyIsSource ? 'source' as const : 'site' as const } : treatment } : {}) } };
  }) };
}

/** Saved Analysis values cannot be converted between Site and Source energy. */
export function visualizationAnalysisBasisIssue(definition: VisualizationDefinition, snapshot: AccountWorkspaceSnapshot): string | undefined {
  const ids = new Set(definition.sources.filter(source => source.kind === 'analysis').map(source => source.analysisGuid));
  const analyses = [...snapshot.facilityAnalyses, ...snapshot.accountAnalyses].filter(analysis => ids.has(analysis.guid) && analysis.analysisCategory === 'energy');
  return new Set(analyses.map(analysis => !!analysis.energyIsSource)).size > 1
    ? 'Selected analyses use different Site/Source settings. Select analyses with the same saved energy basis.' : undefined;
}
