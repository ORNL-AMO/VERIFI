import { Component, computed, input, Signal } from '@angular/core';
import { getFiscalYear } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { AnalysisStatusCheck } from 'src/app/calculations/status-check-calculations/analysisStatusCheck';
import { MeterStatusCheck } from 'src/app/calculations/status-check-calculations/meterStatusCheck';
import { PredictorStatusCheck } from 'src/app/calculations/status-check-calculations/predictorStatusCheck';
import { IdbFacility } from 'src/app/models/idbModels/facility';

interface AnalysisInputAvailability {
  key: string;
  name: string;
  facilityName: string;
  url: string | undefined;
  latestDate: Date | undefined;
  latestCompleteYear: number | undefined;
  missingMonthLabels: Array<string>;
  missingYearLabels: Array<number>;
  hasNoData: boolean;
}

export interface CalculatedReportYearIssue {
  key: string;
  name: string;
  facilityName: string;
  url: string | undefined;
  details: Array<string>;
}

@Component({
  selector: 'app-calculated-report-year-warning',
  templateUrl: './calculated-report-year-warning.component.html',
  standalone: false
})
export class CalculatedReportYearWarningComponent {
  readonly reportYear = input<number | undefined>();
  readonly analysisStatusChecks = input<Array<AnalysisStatusCheck>>([]);
  readonly showFacilityNames = input<boolean>(false);

  readonly issues: Signal<Array<CalculatedReportYearIssue>> = computed(() => {
    const reportYear = this.reportYear();
    if (reportYear === undefined) {
      return [];
    }

    const inputs = this.getAnalysisInputs(reportYear);
    const supportedYears = inputs
      .map(input => input.latestCompleteYear)
      .filter((year): year is number => year !== undefined);
    const latestSupportedYear = supportedYears.length > 0 ? Math.max(...supportedYears) : undefined;

    // A partial latest year is expected and does not explain a calculated report year.
    if (latestSupportedYear === undefined || latestSupportedYear <= reportYear) {
      return [];
    }

    return inputs
      .map(input => this.getIssue(input, latestSupportedYear))
      .filter((issue): issue is CalculatedReportYearIssue => issue !== undefined)
      .sort((a, b) =>
        a.facilityName.localeCompare(b.facilityName) || a.name.localeCompare(b.name)
      );
  });

  private getAnalysisInputs(reportYear: number): Array<AnalysisInputAvailability> {
    const inputs = new Map<string, AnalysisInputAvailability>();

    for (const analysisStatusCheck of this.analysisStatusChecks()) {
      const facility = analysisStatusCheck.facility;
      if (!facility) {
        continue;
      }

      for (const meterStatusCheck of analysisStatusCheck.includedMeterStatusChecks ?? []) {
        const input = this.getMeterAvailability(meterStatusCheck, facility, reportYear);
        inputs.set(input.key, input);
      }

      for (const predictorStatusCheck of analysisStatusCheck.includedPredictorStatusChecks ?? []) {
        const input = this.getPredictorAvailability(predictorStatusCheck, facility, reportYear);
        inputs.set(input.key, input);
      }
    }

    return Array.from(inputs.values());
  }

  private getMeterAvailability(
    meterStatusCheck: MeterStatusCheck,
    facility: IdbFacility,
    reportYear: number
  ): AnalysisInputAvailability {
    const missingMonthLabels = (meterStatusCheck.missingDataMonths ?? [])
      .filter(period => getFiscalYear(period.date, facility) > reportYear)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(period => this.formatMonth(period.date));
    const missingYearLabels = (meterStatusCheck.missingDataYears ?? [])
      .filter(year => this.getLatestAffectedFiscalYear(year, facility) > reportYear)
      .sort((a, b) => a - b);

    return {
      key: `${facility.guid}:meter:${meterStatusCheck.meterId}`,
      name: meterStatusCheck.meterName,
      facilityName: facility.name,
      url: `/data-evaluation/facility/${facility.guid}/utility/energy-consumption/utility-meter/${meterStatusCheck.meterId}/data-table`,
      latestDate: meterStatusCheck.lastDateEntry,
      latestCompleteYear: this.getLatestCompleteYear(meterStatusCheck.lastDateEntry, facility),
      missingMonthLabels,
      missingYearLabels,
      hasNoData: meterStatusCheck.hasNoData
    };
  }

  private getPredictorAvailability(
    predictorStatusCheck: PredictorStatusCheck,
    facility: IdbFacility,
    reportYear: number
  ): AnalysisInputAvailability {
    const missingMonthLabels = (predictorStatusCheck.missingEntryMonths ?? [])
      .filter(period => getFiscalYear(period.date, facility) > reportYear)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(period => this.formatMonth(period.date));

    return {
      key: `${facility.guid}:predictor:${predictorStatusCheck.predictorId}`,
      name: predictorStatusCheck.predictorName,
      facilityName: facility.name,
      url: `/data-evaluation/facility/${facility.guid}/utility/predictors/predictor/${predictorStatusCheck.predictorId}/entries-table`,
      latestDate: predictorStatusCheck.latestEntryDate,
      latestCompleteYear: this.getLatestCompleteYear(predictorStatusCheck.latestEntryDate, facility),
      missingMonthLabels,
      missingYearLabels: [],
      hasNoData: predictorStatusCheck.hasNoData
    };
  }

  private getIssue(
    input: AnalysisInputAvailability,
    latestSupportedYear: number
  ): CalculatedReportYearIssue | undefined {
    const details: Array<string> = [];

    if (input.missingMonthLabels.length > 0) {
      details.push(`Missing: ${input.missingMonthLabels.join(', ')}`);
    }
    if (input.missingYearLabels.length > 0) {
      details.push(`No readings for ${input.missingYearLabels.join(', ')}`);
    }
    if (input.hasNoData) {
      details.push('No data entered');
    } else if (
      input.latestCompleteYear !== undefined &&
      input.latestCompleteYear < latestSupportedYear &&
      input.latestDate
    ) {
      details.push(`Data ends ${this.formatMonth(input.latestDate)}`);
    }

    if (details.length === 0) {
      return undefined;
    }

    return {
      key: input.key,
      name: input.name,
      facilityName: input.facilityName,
      url: input.url,
      details
    };
  }

  private getLatestCompleteYear(date: Date | undefined, facility: IdbFacility): number | undefined {
    if (!date) {
      return undefined;
    }

    const entryDate = new Date(date);
    const fiscalYear = getFiscalYear(entryDate, facility);
    const followingMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 1);
    return getFiscalYear(followingMonth, facility) !== fiscalYear ? fiscalYear : fiscalYear - 1;
  }

  private getLatestAffectedFiscalYear(year: number, facility: IdbFacility): number {
    return Math.max(
      getFiscalYear(new Date(year, 0, 1), facility),
      getFiscalYear(new Date(year, 11, 1), facility)
    );
  }

  private formatMonth(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  }
}
