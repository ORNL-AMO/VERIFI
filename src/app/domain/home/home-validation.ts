import { homeAnalysisBindingValid, homeOwnerValid } from './home-bindings';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { createVisualizationDefinition } from '../visualizations/visualization-definition';
import { decodeVisualizationDefinition } from '../visualizations/visualization-validation';
import { HOME_FORMAT_VERSION, HOME_STARTERS, HomeDashboardDefinition, HomeOwnerState } from './home-dashboard';
import { homeViewKey } from './home-views';

type JsonObject = Record<string, any>;
const object = (value: unknown): value is JsonObject => !!value && typeof value === 'object' && !Array.isArray(value);
export const homeText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(homeText) && new Set(value).size === value.length;
const keys = (value: JsonObject, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
export const homePositiveInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) > 0;

/** Reject lossy/executable state while preserving arbitrary future JSON payloads. */
export function homeJson(value: unknown, parents = new Set<object>(), depth = 0): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (!value || typeof value !== 'object' || parents.has(value) || depth > 100) return false;
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return false;
  parents.add(value);
  const own = Reflect.ownKeys(value).filter(key => !Array.isArray(value) || key !== 'length');
  const valid = (!Array.isArray(value) || own.length === value.length && own.every(key => typeof key === 'string'
    && /^(0|[1-9]\d*)$/.test(key) && Number(key) < value.length)) && own.every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      return typeof key === 'string' && descriptor.enumerable && Object.hasOwn(descriptor, 'value') && homeJson(descriptor.value, parents, depth + 1);
    });
  parents.delete(value);
  return valid;
}
export function homeDefaultsValid(value: unknown): boolean {
  if (!object(value) || !keys(value, ['period', 'displaySettings', 'emissionsTreatment'])) return false;
  // Reuse the authoritative period/display grammar, without permitting source/filter overrides.
  const probe = { ...createVisualizationDefinition('Home controls', 'validation-owner', { kind: 'all' }, 'utility'),
    ...(value.period !== undefined ? { period: value.period } : {}),
    ...(value.displaySettings !== undefined ? { displaySettings: value.displaySettings } : {}) };
  if (['invalid', 'unsupported'].includes(decodeVisualizationDefinition(probe).state)) return false;
  if (value.displaySettings?.units) {
    const converter = new ConvertValue(undefined, '', '');
    if (Object.entries(value.displaySettings.units).some(([quantity, binding]: [string, any]) => binding.kind === 'pinned'
      && converter.getUnit(binding.value)?.measure !== quantity)) return false;
  }
  return value.emissionsTreatment === undefined || ['market', 'location'].includes(value.emissionsTreatment);
}

export function homeDashboardReferenceValid(value: unknown): boolean {
  return object(value) && (value.kind === 'saved'
    ? keys(value, ['kind', 'dashboardGuid']) && homeText(value.dashboardGuid)
    : value.kind === 'built-in' && keys(value, ['kind', 'template', 'version'])
      && HOME_STARTERS.includes(value.template) && homePositiveInteger(value.version));
}
function homeViewPreferencesValid(value: unknown): boolean {
  const refs = (items: unknown): boolean => Array.isArray(items) && items.every(homeDashboardReferenceValid)
    && new Set(items.map(homeViewKey)).size === items.length;
  return object(value) && keys(value, ['version', 'catalog', 'order', 'default', 'hidden', 'deleted']) && value.version === 1
    && refs(value.catalog) && value.catalog.every(item => item.kind === 'built-in') && refs(value.order) && refs(value.hidden) && refs(value.deleted)
    && (value.default === undefined || homeDashboardReferenceValid(value.default));
}
function widgetValid(widget: unknown): boolean {
  if (!object(widget) || !homeText(widget.id) || !['half', 'full'].includes(widget.size)
    || !['always', 'water', 'emissions'].includes(widget.visibility) || widget.title !== undefined && typeof widget.title !== 'string'
    || widget.templateKey !== undefined && !homeText(widget.templateKey)) return false;
  const base = ['id', 'size', 'visibility', 'title', 'templateKey', 'kind'];
  switch (widget.kind) {
    case 'built-in-chart': {
      const ref = widget.reference;
      return keys(widget, [...base, 'reference', 'inherit', 'overrides']) && object(ref) && keys(ref, ['kind', 'recipe', 'version', 'owner'])
        && ref.kind === 'built-in' && homeText(ref.recipe) && homePositiveInteger(ref.version) && homeOwnerValid(ref.owner)
        && Array.isArray(widget.inherit) && new Set(widget.inherit).size === widget.inherit.length
        && widget.inherit.every(key => ['period', 'units', 'energyTreatment', 'emissionsTreatment'].includes(key)) && homeDefaultsValid(widget.overrides);
    }
    case 'visualization': return keys(widget, [...base, 'visualizationGuid', 'inherit', 'overrides']) && homeText(widget.visualizationGuid)
      && Array.isArray(widget.inherit) && new Set(widget.inherit).size === widget.inherit.length
      && widget.inherit.every(key => ['period', 'units', 'energyTreatment', 'emissionsTreatment'].includes(key)) && homeDefaultsValid(widget.overrides);
    case 'note': return keys(widget, [...base, 'text']) && typeof widget.text === 'string';
    case 'shortcut': {
      const target = widget.destination;
      return keys(widget, [...base, 'destination']) && object(target) && keys(target, ['area', 'owner', 'resource'])
        && ['data', 'analysis', 'reports', 'visualizations', 'settings'].includes(target.area) && homeOwnerValid(target.owner)
        && (target.resource === undefined || object(target.resource) && keys(target.resource, ['kind', 'guid'])
          && ['meter', 'predictor', 'equipment', 'analysis'].includes(target.resource.kind) && homeText(target.resource.guid));
    }
    case 'goal': return keys(widget, [...base, 'binding']) && homeAnalysisBindingValid(widget.binding);
    case 'actions': case 'owner-summary': return keys(widget, [...base, 'settings']) && object(widget.settings)
      && keys(widget.settings, ['scope']) && widget.settings.scope === 'owner';
    case 'table': return keys(widget, [...base, 'settings']) && object(widget.settings) && keys(widget.settings, ['view', 'measure', 'period', 'categories'])
      && (widget.settings.categories === undefined || widget.settings.view === 'facility-progress' && Array.isArray(widget.settings.categories) && widget.settings.categories.length > 0 && new Set(widget.settings.categories).size === widget.settings.categories.length && widget.settings.categories.every(value => ['energy', 'water'].includes(value)))
      && ['facility-progress', 'utility-detail', 'utility-summary', 'equipment-summary'].includes(widget.settings.view)
      && ['energy', 'cost', 'emissions', 'water'].includes(widget.settings.measure)
      && ['utility-window', 'all-years', 'latest-result', 'latest-equipment-year'].includes(widget.settings.period);
    case 'map': return keys(widget, [...base, 'settings']) && object(widget.settings) && keys(widget.settings, ['measure'])
      && ['energy', 'cost', 'emissions', 'water'].includes(widget.settings.measure);
    default: return false;
  }
}
export type HomeDecode<T> = { readonly state: 'valid'; readonly value: T } | { readonly state: 'invalid' | 'unsupported'; readonly message: string };
export function decodeHomeDashboard(value: unknown): HomeDecode<HomeDashboardDefinition> {
  if (!homeJson(value) || !object(value)) return { state: 'invalid', message: 'Dashboard intent must be serializable JSON.' };
  if (homePositiveInteger(value.version) && value.version !== HOME_FORMAT_VERSION) return { state: 'unsupported', message: 'Unsupported dashboard format.' };
  if (!keys(value, ['version', 'name', 'widgets', 'defaults', 'visibility', 'builtIn']) || value.version !== HOME_FORMAT_VERSION || !homeText(value.name)
    || value.builtIn !== undefined && (!homeDashboardReferenceValid(value.builtIn) || value.builtIn.kind !== 'built-in')
    || !['always', 'water', 'emissions', 'hidden'].includes(value.visibility) || !Array.isArray(value.widgets) || !value.widgets.every(widgetValid)
    || new Set(value.widgets.map(widget => widget.id)).size !== value.widgets.length || !homeDefaultsValid(value.defaults))
    return { state: 'invalid', message: 'Invalid dashboard name, widgets, layout or defaults.' };
  return { state: 'valid', value: structuredClone(value) as HomeDashboardDefinition };
}
export function decodeHomeOwnerState(value: unknown): HomeDecode<HomeOwnerState> {
  if (!homeJson(value) || !object(value)) return { state: 'invalid', message: 'Owner state must be serializable JSON.' };
  if (homePositiveInteger(value.version) && value.version !== HOME_FORMAT_VERSION) return { state: 'unsupported', message: 'Unsupported owner state format.' };
  if (object(value.views) && homePositiveInteger(value.views.version) && value.views.version !== 1)
    return { state: 'unsupported', message: 'Unsupported Home view preferences. Saved choices are preserved.' };
  if (!keys(value, ['version', 'initialized', 'dashboardOrder', 'defaultDashboardGuid', 'deletedStarters', 'views']) || value.version !== HOME_FORMAT_VERSION
    || value.views !== undefined && !homeViewPreferencesValid(value.views)
    || typeof value.initialized !== 'boolean' || !strings(value.dashboardOrder) || value.defaultDashboardGuid !== undefined && !homeText(value.defaultDashboardGuid)
    || !strings(value.deletedStarters) || value.deletedStarters.some(key => ![...HOME_STARTERS, 'blank'].includes(key as any)))
    return { state: 'invalid', message: 'Invalid Home initialization, order or default state.' };
  return { state: 'valid', value: structuredClone(value) as HomeOwnerState };
}
