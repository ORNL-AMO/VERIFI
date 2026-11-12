import type { IdbAccount } from '@data/models/idbModels/account';
import type { IdbFacility } from '@data/models/idbModels/facility';
import { getFiscalYear } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import type { VisualizationPeriod, VisualizationComparison } from '../visualization-definition';
import type { VisualizationSourceRequest } from '../visualization-source-provider';

export type UtilityCalendar = Pick<IdbAccount | IdbFacility, 'fiscalYear' | 'fiscalYearMonth' | 'fiscalYearCalendarEnd'>;
export interface UtilityRange { readonly start: string; readonly end: string; readonly role: 'primary' | 'comparison'; readonly basis: 'calendar' | 'fiscal' }
export function civilDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function parseCivil(value: string): Date { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); }
export function validCivil(value: string): boolean { return /^\d{4}-\d{2}-\d{2}$/.test(value) && civilDate(parseCivil(value)) === value; }
export function monthRange(year: number, month: number) { return { start: civilDate(new Date(year, month, 1, 12)), end: civilDate(new Date(year, month + 1, 0, 12)) }; }
export function fiscalRange(year: number, owner: UtilityCalendar) {
  const month = owner.fiscalYear === 'nonCalendarYear' ? owner.fiscalYearMonth ?? 0 : 0;
  const startYear = year - (owner.fiscalYear === 'nonCalendarYear' && owner.fiscalYearCalendarEnd ? 1 : 0);
  return { start: civilDate(new Date(startYear, month, 1, 12)), end: civilDate(new Date(startYear + 1, month, 0, 12)) };
}
export function fiscalYear(date: string, owner: UtilityCalendar): number { return getFiscalYear(parseCivil(date), owner as IdbAccount); }
export function overlaps(a: { start: string; end: string }, b: { start: string; end: string }) { return a.start <= b.end && b.start <= a.end; }
export function shiftMonths(value: string, count: number): string {
  const date = parseCivil(value), day = date.getDate();
  return civilDate(new Date(date.getFullYear(), date.getMonth() + count, Math.min(day, new Date(date.getFullYear(), date.getMonth() + count + 1, 0).getDate()), 12));
}
export function resolveUtilityRanges(period: VisualizationPeriod, comparison: VisualizationComparison, owner: UtilityCalendar,
  dates: VisualizationSourceRequest['dateContext'], history?: { start: string; end: string }): UtilityRange[] {
  let primary: UtilityRange;
  const range = (start: string, end: string, basis: UtilityRange['basis']): UtilityRange => ({ start, end, basis, role: 'primary' });
  if (period.kind === 'fixed') primary = range(period.start, period.end, period.basis);
  else if (period.kind === 'fiscal-year') primary = { ...fiscalRange(period.year, owner), role: 'primary', basis: 'fiscal' };
  else if (period.kind === 'latest-saved-year') {
    if (!history) return [];
    primary = { ...fiscalRange(fiscalYear(history.end, owner), owner), role: 'primary', basis: 'fiscal' };
  } else if (period.kind === 'rolling') {
    const anchor = period.anchor === 'latest-data' ? dates.latestDataDate : dates.calendarDate;
    if (!anchor || !validCivil(anchor)) throw new Error('No eligible data is available for the rolling anchor.');
    const endMonth = period.unit === 'month' ? monthRange(parseCivil(anchor).getFullYear(), parseCivil(anchor).getMonth())
      : period.basis === 'fiscal' ? fiscalRange(fiscalYear(anchor, owner), owner) : { start: `${anchor.slice(0, 4)}-01-01`, end: `${anchor.slice(0, 4)}-12-31` };
    const includeAnchor = period.includeIncomplete || anchor === endMonth.end;
    const end = includeAnchor ? anchor : civilDate(new Date(parseCivil(endMonth.start).getTime() - 86400000));
    const months = period.count * (period.unit === 'year' ? 12 : 1);
    const start = includeAnchor ? shiftMonths(endMonth.start, -(period.count - 1) * (period.unit === 'year' ? 12 : 1))
      : shiftMonths(endMonth.start, -months);
    primary = range(start, end, period.basis);
  } else {
    if (!history) return [];
    primary = range(history.start, history.end, 'calendar');
  }
  if (!validCivil(primary.start) || !validCivil(primary.end) || primary.start > primary.end) throw new Error('Choose a valid date interval.');
  const result = [primary];
  if (comparison.kind !== 'none') {
    let compared: UtilityRange;
    if (comparison.kind === 'custom') compared = { ...comparison, role: 'comparison', basis: primary.basis };
    else if (comparison.kind === 'previous-year') compared = { start: shiftMonths(primary.start, -12), end: shiftMonths(primary.end, -12), role: 'comparison', basis: comparison.basis };
    else {
      // Complete month intervals retain month alignment; custom day intervals retain their duration.
      const start = parseCivil(primary.start), end = parseCivil(primary.end);
      if (start.getDate() === 1 && end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
        const count = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
        compared = { start: shiftMonths(primary.start, -count), end: civilDate(new Date(start.getTime() - 86400000)), role: 'comparison', basis: primary.basis };
      } else {
        const duration = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
        compared = { start: civilDate(new Date(start.getTime() - duration * 86400000)), end: civilDate(new Date(start.getTime() - 86400000)), role: 'comparison', basis: primary.basis };
      }
    }
    if (!validCivil(compared.start) || !validCivil(compared.end) || compared.start > compared.end) throw new Error('Choose valid comparison dates.');
    result.push(compared);
  }
  return result;
}
