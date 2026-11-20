export interface EmissionFactorsPeriod { readonly startYear?: number | null; readonly endYear?: number | null; }
export function validEmissionFactorYear(year: unknown): year is number {
  return typeof year === 'number' && Number.isInteger(year) && year >= 1800 && year <= 9999;
}
export function validEmissionFactorsPeriod(period: EmissionFactorsPeriod | undefined): boolean {
  return validEmissionFactorYear(period?.startYear) && validEmissionFactorYear(period?.endYear)
    && period.startYear < period.endYear;
}
