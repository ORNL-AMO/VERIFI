import type { MeterSource } from '@data/models/constantsAndTypes';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { AnnualConditionsForm, AnnualConsumptionForm } from './energy-use-setup-form.service';

export interface AnnualSourceView {
  readonly entry: AnnualConsumptionForm;
  readonly key: string;
  readonly source: MeterSource;
  readonly icon: IconName;
  readonly amount: number | null;
  readonly error: string;
  readonly ambiguous: boolean;
  readonly knownUnit: boolean;
  readonly manual: boolean;
  readonly modeLabel: string;
}

/** Form-bound presentation shared by the full Setup editor and annual draft slideout. */
export interface AnnualYearView {
  readonly year: number;
  readonly conditions: readonly AnnualConditionsForm[];
  readonly sources: readonly AnnualSourceView[];
  readonly hasElectricity: boolean;
  readonly ambiguous: boolean;
  readonly complete: boolean;
  readonly missingSources: readonly MeterSource[];
}
