/** Pure owner/rule grammar shared by dashboards and saved analysis sources. */
const object = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, any>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
const homeText = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
export function homeOwnerValid(value: unknown): boolean {
  return object(value) && keys(value, ['kind', 'guid']) && ['account', 'facility'].includes(value.kind) && homeText(value.guid);
}
export function homeAnalysisBindingValid(value: unknown): boolean {
  return object(value) && (value.kind === 'reporting' ? keys(value, ['kind', 'owner', 'category'])
    && homeOwnerValid(value.owner) && ['energy', 'water'].includes(value.category)
    : value.kind === 'exact' && keys(value, ['kind', 'analysisGuid']) && homeText(value.analysisGuid));
}
