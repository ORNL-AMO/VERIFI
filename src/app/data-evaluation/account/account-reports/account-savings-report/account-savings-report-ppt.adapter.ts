import { inject, Injectable } from '@angular/core';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PerformanceReport } from 'src/app/calculations/performance-report-calculations/performanceReport';
import { AccountSavingsReportSetup } from 'src/app/models/overview-report';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { PptSlide, TableSlide, ChartSlide, TableHeaderCell } from 'src/app/shared/ppt-report/models/ppt-slide';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';

export interface AccountSavingsReportPptInput {
    report: IdbAccountReport;
    account: IdbAccount;
    analysisItem: IdbAccountAnalysisItem;
    setup: AccountSavingsReportSetup;
    annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    facilitySummaries: Array<{
        facility: IdbFacility;
        analysisItem: IdbAnalysisItem;
        monthlySummaryData: Array<MonthlyAnalysisSummaryData>;
        annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
        latestMonthSummary: MonthlyAnalysisSummaryData;
    }>;
    lastMonthSummary: MonthlyAnalysisSummaryData;
    performanceReport: PerformanceReport;
    analysisTableColumns: AnalysisTableColumns;
}

@Injectable({ providedIn: 'root' })
export class AccountSavingsReportPptAdapter {
    customNumberPipe: CustomNumberPipe = inject(CustomNumberPipe);

    analysisTableColumns: AnalysisTableColumns;
    accountAnalysisItem: IdbAccountAnalysisItem;

    buildDocument(data: AccountSavingsReportPptInput): PptDocument {
        const slides: PptSlide[] = [];
        const unit = data.analysisItem.analysisCategory === 'water' ? data.analysisItem.waterUnit : data.analysisItem.energyUnit;
        this.analysisTableColumns = data.analysisTableColumns;
        this.accountAnalysisItem = data.analysisItem;
        slides.push({
            type: 'title',
            title: data.report.name,
            subtitle: data.account.name,
            date: new Date().toISOString(),
        });

        // Annual company section
        if (data.setup.includeAnnualResults && (data.setup.includeAnnualResultsTable || data.setup.includeAnnualResultsGraph || data.setup.includeAccountMonthlyTable || data.setup.includeAccountMonthlyResults)) {
            if (data.setup.includeAnnualResultsTable && data.annualAnalysisSummaries?.length) {
                slides.push(this.buildAnnualConsumptionTable(data.annualAnalysisSummaries, data.lastMonthSummary));
                slides.push(this.buildAnnualSavingsTable(data.annualAnalysisSummaries, data.lastMonthSummary));
            }
            if (data.setup.includeAnnualResultsGraph && data.annualAnalysisSummaries?.length) {
                slides.push(this.buildAnnualConsumptionChart(data.annualAnalysisSummaries, unit));
                slides.push(this.buildAnnualPercentImprovementChart(data.annualAnalysisSummaries));
            }
            if (data.setup.includeAccountMonthlyTable && data.monthlyAnalysisSummaryData?.length) {
                slides.push(this.buildMonthlyConsumptionTable(data.monthlyAnalysisSummaryData));
                slides.push(this.buildMonthlySavingsTable(data.monthlyAnalysisSummaryData));
            }
            if (data.setup.includeAccountMonthlyResults && data.monthlyAnalysisSummaryData?.length) {
                slides.push(this.buildMonthlyConsumptionChart(data.monthlyAnalysisSummaryData, unit));
                slides.push(this.buildMonthlySavingsChart(data.monthlyAnalysisSummaryData));
            }
        }

        // Per-facility section
        if (data.setup.includeFacilityResults) {
            data.facilitySummaries?.forEach(fs => {
                slides.push({ type: 'title', title: fs.facility.name, subtitle: 'Facility Analysis' });

                if (data.setup.includeFacilityResultsTable && fs.annualAnalysisSummaries?.length) {
                    slides.push(this.buildAnnualConsumptionTable(fs.annualAnalysisSummaries, fs.latestMonthSummary, fs.facility.name));
                    slides.push(this.buildAnnualSavingsTable(fs.annualAnalysisSummaries, fs.latestMonthSummary, fs.facility.name));
                }
                if (data.setup.includeFacilityResultsGraph && fs.annualAnalysisSummaries?.length) {
                    slides.push(this.buildAnnualConsumptionChart(fs.annualAnalysisSummaries, unit, fs.facility.name));
                    slides.push(this.buildAnnualPercentImprovementChart(fs.annualAnalysisSummaries, fs.facility.name));
                }
                if (data.setup.includeFacilityMonthlyResultsGraph && fs.monthlySummaryData?.length) {
                    slides.push(this.buildMonthlyConsumptionChart(fs.monthlySummaryData, unit, fs.facility.name));
                    slides.push(this.buildMonthlySavingsChart(fs.monthlySummaryData, fs.facility.name));
                }
            });
        }

        // Performance section
        if (data.setup.includePerformanceResults) {
            if (data.setup.includePerformanceResultsTable && data.performanceReport?.annualFacilityData?.length) {
                if (data.setup.includePerformanceActual) {
                    slides.push(this.buildPerformanceMetricTable(
                        data.performanceReport,
                        'Facility Performance - Actual',
                        `Actual (${unit})`,
                        d => this.formatValue(d.actual, false),
                        d => this.formatPercent(d.changeInSavings),
                        d => this.formatPercent(d.changeInContribution)
                    ));
                }
                if (data.setup.includePerformanceAdjusted) {
                    slides.push(this.buildPerformanceMetricTable(
                        data.performanceReport,
                        'Facility Performance - Adjusted',
                        `Adjusted (${unit})`,
                        d => this.formatValue(d.adjusted, false),
                        d => this.formatPercent(d.changeInSavings),
                        d => this.formatPercent(d.changeInContribution)
                    ));
                }
                if (data.setup.includePerformanceSavings) {
                    slides.push(this.buildPerformanceMetricTable(
                        data.performanceReport,
                        'Facility Performance - Savings (%)',
                        'Savings (%)',
                        d => this.formatPercent(d.savings),
                        d => this.formatPercent(d.changeInSavings),
                        d => this.formatPercent(d.changeInContribution)
                    ));
                }
                if (data.setup.includePerformanceContribution) {
                    slides.push(this.buildPerformanceMetricTable(
                        data.performanceReport,
                        'Facility Performance - Contribution (%)',
                        'Contribution (%)',
                        d => this.formatPercent(d.contribution),
                        d => this.formatPercent(d.changeInSavings),
                        d => this.formatPercent(d.changeInContribution)
                    ));
                }
            }
            if (data.setup.includePerformanceResultsGraph && data.performanceReport?.facilityTotals?.length) {
                slides.push(this.buildPerformanceChart(data.performanceReport));
            }
        }

        return {
            metadata: { title: data.report.name, subtitle: data.account.name },
            slides,
        };
    }

    private buildAnnualConsumptionTable(summaries: Array<AnnualAnalysisSummary>, latestMonthSummary: MonthlyAnalysisSummaryData, facilityName?: string): TableSlide {
        const title = facilityName ? `${facilityName} — Annual Consumption` : 'Annual Company Analysis — Consumption';
        const subHeaders: Array<string | TableHeaderCell> = this.getEnergyColumns(this.analysisTableColumns);
        const energyColCount = subHeaders.length - 1;
        let rows: string[][] = [];
        summaries.forEach(s => {
            let row: string[] = [];
            row.push(s.year.toString());
            if (this.analysisTableColumns.energy) {
                row.push(this.formatValue(s.energyUse, false));
            }
            if (this.analysisTableColumns.adjusted) {
                row.push(this.formatValue(s.adjusted, false));
            }
            if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
                row.push(this.formatValue(s.baselineAdjustment, false));
            }
            if (this.analysisTableColumns.baselineAdjustmentForOther) {
                row.push(this.formatValue(s.baselineAdjustmentForOtherV2, false));
            }
            if (this.analysisTableColumns.baselineAdjustment) {
                row.push(this.formatValue(s.baselineAdjustment, false));
            }
            rows.push(row);
        });
        let latestRow: string[] = [];
        latestRow.push(latestMonthSummary.date.toLocaleString('en-US', { month: 'short', year: 'numeric' }) + ' *');
        if (this.analysisTableColumns.energy) {
            latestRow.push(this.formatValue(latestMonthSummary.energyUse, false));
        }
        if (this.analysisTableColumns.adjusted) {
            latestRow.push(this.formatValue(latestMonthSummary.adjusted, false));
        }
        if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
            latestRow.push(this.formatValue(latestMonthSummary.baselineAdjustmentForNormalization, false));
        }
        if (this.analysisTableColumns.baselineAdjustmentForOther) {
            latestRow.push(this.formatValue(latestMonthSummary.baselineAdjustmentForOtherV2, false));
        }
        if (this.analysisTableColumns.baselineAdjustment) {
            latestRow.push(this.formatValue(latestMonthSummary.baselineAdjustment, false));
        }
        rows.push(latestRow);

        return {
            type: 'table',
            title,
            headers: [
                { content: '', colspan: 1 },
                { content: this.accountAnalysisItem.analysisCategory === 'water' ? `Consumption (${this.accountAnalysisItem.waterUnit})` : `Energy (${this.accountAnalysisItem.energyUnit})`, colspan: energyColCount }
            ],
            subHeaders,
            rows: rows,
            note: '* This represents the rolling 12-month energy use and savings for the last month of the report'
        };
    }

    private buildAnnualSavingsTable(summaries: Array<AnnualAnalysisSummary>, latestMonthSummary: MonthlyAnalysisSummaryData, facilityName?: string): TableSlide {
        const title = facilityName ? `${facilityName} — Annual Savings` : 'Annual Company Analysis — Savings';
        const subHeaders: Array<string | TableHeaderCell> = this.getSavingsColumns(this.analysisTableColumns);
        const savingsColCount = subHeaders.length - 1;
        let rows: string[][] = [];
        summaries.forEach(s => {
            let row: string[] = [];
            row.push(s.year.toString());
            if (this.analysisTableColumns.SEnPI) {
                row.push(this.formatValue(s.SEnPI, false));
            }
            if (this.analysisTableColumns.bankedSavings) {
                row.push(this.formatValue(s.savingsBanked, false));
            }
            if (this.analysisTableColumns.savingsUnbanked) {
                row.push(this.formatValue(s.savingsUnbanked, false));
            }
            if (this.analysisTableColumns.savings) {
                row.push(this.formatValue(s.savings, false));
            }
            if (this.analysisTableColumns.totalSavingsPercentImprovement) {
                row.push(this.formatPercent(s.totalSavingsPercentImprovement));
            }
            if (this.analysisTableColumns.newSavings) {
                row.push(this.formatValue(s.newSavings, false));
            }
            if (this.analysisTableColumns.annualSavingsPercentImprovement) {
                row.push(this.formatPercent(s.annualSavingsPercentImprovement));
            }
            if (this.analysisTableColumns.cummulativeSavings) {
                row.push(this.formatValue(s.cummulativeSavings, false));
            }
            rows.push(row);
        });
        let latestRow: string[] = [];
        latestRow.push(latestMonthSummary.date.toLocaleString('en-US', { month: 'short', year: 'numeric' }) + ' *');
        if (this.analysisTableColumns.SEnPI) {
            latestRow.push(this.formatValue(latestMonthSummary.SEnPI, false));
        }
        if (this.analysisTableColumns.bankedSavings) {
            latestRow.push(this.formatValue(0, false));
        }
        if (this.analysisTableColumns.savingsUnbanked) {
            latestRow.push(this.formatValue(0, false));
        }
        if (this.analysisTableColumns.savings) {
            latestRow.push(this.formatValue(latestMonthSummary.rollingSavings, false));
        }
        if (this.analysisTableColumns.totalSavingsPercentImprovement) {
            latestRow.push(this.formatPercent(latestMonthSummary.rolling12MonthImprovement));
        }
        if (this.analysisTableColumns.newSavings) {
            latestRow.push(this.formatValue(0, false));
        }
        if (this.analysisTableColumns.annualSavingsPercentImprovement) {
            latestRow.push(this.formatPercent(0));
        }
        if (this.analysisTableColumns.cummulativeSavings) {
            latestRow.push(this.formatValue(0, false));
        }
        rows.push(latestRow);

        return {
            type: 'table',
            title,
            headers: [
                { content: '', colspan: 1 },
                { content: 'Incremental Improvement', colspan: savingsColCount }
            ],
            subHeaders,
            rows: rows,
            note: '* This represents the rolling 12-month energy use and savings for the last month of the report'
        };
    }

    private buildAnnualConsumptionChart(summaries: Array<AnnualAnalysisSummary>, unit: string, facilityName?: string): ChartSlide {
        const isWater = this.accountAnalysisItem.analysisCategory === 'water';
        const allValues = summaries.flatMap(s => [s.energyUse ?? 0, s.adjusted ?? 0]).filter(v => isFinite(v) && !isNaN(v));
        return {
            type: 'chart',
            title: isWater ? (facilityName ? `${facilityName} — Annual Water Consumption` : 'Annual Water Consumption') : (facilityName ? `${facilityName} — Annual Energy Use` : 'Annual Energy Use'),
            chartType: 'bar',
            labels: summaries.map(s => String(s.year)),
            yAxisUnit: unit,
            valAxisMinVal: this.calculateAxisMin(allValues),
            showLegend: true,
            series: [
                {
                    name: isWater ? 'Actual Water Consumption' : 'Actual Energy Use',
                    data: summaries.map(s => s.energyUse ?? 0),
                    color: '7F7F7F'
                },
                {
                    name: isWater ? 'Calculated Water Consumption' : 'Calculated Energy Use',
                    data: summaries.map(s => s.adjusted ?? 0),
                    color: isWater ? '3498DB' : '7D3C98'
                },
            ],
        };
    }

    private buildAnnualPercentImprovementChart(summaries: Array<AnnualAnalysisSummary>, facilityName?: string): ChartSlide {
        const isWater = this.accountAnalysisItem.analysisCategory === 'water';
        const label = isWater ? 'Annual Consumption Improvement (%)' : 'Annual Energy Improvement (%)';
        const allValues = summaries.flatMap(s => [s.totalSavingsPercentImprovement ?? 0, s.annualSavingsPercentImprovement ?? 0]).filter(v => isFinite(v) && !isNaN(v));
        return {
            type: 'chart',
            title: facilityName ? `${facilityName} — ${label}` : label,
            chartType: 'line',
            labels: summaries.map(s => String(s.year)),
            valAxisLabelFormatCode: '0.0"%"',
            valAxisMinVal: this.calculateAxisMin(allValues),
            showLegend: true,
            series: [
                {
                    name: label,
                    data: summaries.map(s => s.annualSavingsPercentImprovement ?? 0),
                    color: '1F77B4',
                },
                {
                    name: isWater ? 'Total Consumption Improvement (%)' : 'Total Energy Improvement (%)',
                    data: summaries.map(s => s.totalSavingsPercentImprovement ?? 0),
                    color: 'FF7F0E',
                },
            ],
        };
    }

    private buildMonthlyConsumptionTable(data: Array<MonthlyAnalysisSummaryData>, facilityName?: string): TableSlide {
        const title = facilityName ? `${facilityName} — Monthly Consumption` : 'Monthly Company Analysis — Consumption';
        const subHeaders: Array<string | TableHeaderCell> = this.getEnergyColumns(this.analysisTableColumns, true);
        const energyColCount = subHeaders.length - 2;
        let rows: string[][] = [];
        data.forEach(s => {
            let row: string[] = [];
            row.push(s.date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
            row.push(s.fiscalYear.toString());
            if (this.analysisTableColumns.energy) {
                row.push(this.formatValue(s.energyUse, false));
            }
            if (this.analysisTableColumns.adjusted) {
                row.push(this.formatValue(s.adjusted, false));
            }
            if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
                row.push(this.formatValue(s.baselineAdjustment, false));
            }
            if (this.analysisTableColumns.baselineAdjustmentForOther) {
                row.push(this.formatValue(s.baselineAdjustmentForOtherV2, false));
            }
            if (this.analysisTableColumns.baselineAdjustment) {
                row.push(this.formatValue(s.baselineAdjustment, false));
            }
            rows.push(row);
        });

        return {
            type: 'table',
            title,
            headers: [
                { content: '', colspan: 2 },
                { content: this.accountAnalysisItem.analysisCategory === 'water' ? `Consumption (${this.accountAnalysisItem.waterUnit})` : `Energy (${this.accountAnalysisItem.energyUnit})`, colspan: energyColCount }
            ],
            subHeaders,
            rows: rows
        };
    }

    private buildMonthlySavingsTable(data: Array<MonthlyAnalysisSummaryData>, facilityName?: string): TableSlide {
        const title = facilityName ? `${facilityName} — Monthly Savings` : 'Monthly Company Analysis — Savings';
        const subHeaders: Array<string | TableHeaderCell> = this.getSavingsColumns(this.analysisTableColumns, true);
        const savingsColCount = subHeaders.length - 2;
        let rows: string[][] = [];
        data.forEach(s => {
            let row: string[] = [];
            row.push(s.date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
            row.push(s.fiscalYear.toString());
            if (this.analysisTableColumns.SEnPI) {
                row.push(this.formatValue(s.SEnPI, false));
            }
            if (this.analysisTableColumns.bankedSavings) {
                row.push(this.formatValue(s.savingsBanked, false));
            }
            if (this.analysisTableColumns.savingsUnbanked) {
                row.push(this.formatValue(s.savingsUnbanked, false));
            }
            if (this.analysisTableColumns.savings) {
                row.push(this.formatValue(s.savings, false));
            }
            if (this.analysisTableColumns.rollingSavings) {
                row.push(this.formatValue(s.rollingSavings, false));
            }
            if (this.analysisTableColumns.rolling12MonthImprovement) {
                row.push(this.formatPercent(s.rolling12MonthImprovement));
            }
            rows.push(row);
        });

        return {
            type: 'table',
            title,
            headers: [
                { content: '', colspan: 2 },
                { content: 'Incremental Improvement', colspan: savingsColCount }
            ],
            subHeaders,
            rows: rows
        };
    }

    private buildMonthlyConsumptionChart(data: Array<MonthlyAnalysisSummaryData>, unit: string, facilityName?: string): ChartSlide {
        const isWater = this.accountAnalysisItem.analysisCategory === 'water';
        const label1 = isWater ? 'Actual Water Consumption' : 'Actual Energy Use';
        const label2 = isWater ? 'Calculated Water Consumption' : 'Calculated Energy Use';
        const allValues = data.flatMap(m => [m.energyUse ?? 0, m.adjusted ?? 0]).filter(v => isFinite(v) && !isNaN(v));
        return {
            type: 'chart',
            title: facilityName ? `${facilityName} — Monthly Analysis` : 'Monthly Analysis',
            chartType: 'line',
            labels: data.map(m => m.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })),
            yAxisUnit: unit,
            valAxisMinVal: this.calculateAxisMin(allValues),
            showLegend: true,
            series: [
                {
                    name: label2,
                    data: data.map(m => m.adjusted ?? 0),
                    color: isWater ? '3498DB' : '7D3C98'
                },
                {
                    name: label1,
                    data: data.map(m => m.energyUse ?? 0),
                    color: '7F7F7F'
                }
            ],
        };
    }

    private buildMonthlySavingsChart(data: Array<MonthlyAnalysisSummaryData>, facilityName?: string): ChartSlide {
        const allValues = data.flatMap(m => [m.rolling12MonthImprovement ?? 0]).filter(v => isFinite(v) && !isNaN(v));
        return {
            type: 'chart',
            title: facilityName ? `${facilityName} — Monthly Savings` : 'Monthly Savings',
            chartType: 'bar',
            labels: data.map(m => m.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })),
            yAxisUnit: 'Percent Savings',
            valAxisLabelFormatCode: '0"%"',
            valAxisMinVal: this.calculateAxisMin(allValues),
            showLegend: true,
            series: [
                {
                    name: 'Savings',
                    data: data.map(m => {
                        if (m.rolling12MonthImprovement >= 0) {
                            return m.rolling12MonthImprovement ?? 0;
                        } else {
                            return 0;
                        }
                    }),
                    color: '58D68D'
                },
                {
                    name: 'Losses',
                    data: data.map(m => {
                        if (m.rolling12MonthImprovement < 0) {
                            return m.rolling12MonthImprovement ?? 0;
                        } else {
                            return undefined;
                        }
                    }),
                    color: 'EC7063'
                }
            ],
        };
    }

    private buildPerformanceMetricTable(perf: PerformanceReport, title: string, headerTitle: string,
        valueFormatter: (d: any) => string,
        savingsChangeFormatter: (d: any) => string,
        contributionChangeFormatter: (d: any) => string): TableSlide {

        const rows: string[][] = [];
        const years = perf.facilityTotals.map(t => String(t.year));
        const headers: Array<string | TableHeaderCell> = [
            { content: '', colspan: 2 },
            { content: headerTitle, colspan: years.length },
            { content: 'Change', colspan: 2 }
        ];
        const subHeaders: Array<string | TableHeaderCell> = ['Facility', 'State', ...years, 'Savings', 'Contribution'];

        perf.annualFacilityData.forEach(fd => {
            const row: string[] = [];
            row.push(fd.facility.name);
            row.push(fd.facility?.state ?? '');
            years.forEach(year => {
                const data = fd.annualData.find(d => String(d.year) === year);
                if (data) {
                    row.push(valueFormatter(data));
                }
            });

            const latest = fd.annualData[fd.annualData.length - 1];
            row.push(latest ? savingsChangeFormatter(latest) : '—');
            row.push(latest ? contributionChangeFormatter(latest) : '—');

            rows.push(row);
        });

        const totalRow: string[] = [];
        totalRow.push('Totals');
        totalRow.push('');
        perf.facilityTotals.forEach(t => {
            totalRow.push(valueFormatter(t));
        });
        const latestTotal = perf.facilityTotals[perf.facilityTotals.length - 1];
        totalRow.push(latestTotal ? savingsChangeFormatter(latestTotal) : '—');
        totalRow.push(latestTotal ? contributionChangeFormatter(latestTotal) : '—');

        rows.push(totalRow);
        return {
            type: 'table',
            title: title,
            headers: headers,
            subHeaders: subHeaders,
            rows: rows,
        };
    }

    private buildPerformanceChart(perf: PerformanceReport): ChartSlide {
        const allValues = perf.annualFacilityData.flatMap(fd => fd.annualData.map(d => d.savings)).filter(v => isFinite(v) && !isNaN(v));
        const years = perf.facilityTotals.map(t => String(t.year));
        const facilitySeries = perf.annualFacilityData.map(fd => ({
            name: fd.facility.name,
            data: fd.annualData.map(d => d.savings),
            color: fd.facility.color,
            lineDash: 'solid' as const,
            lineSize: 2
        }));
        const corporateSeries = {
            name: 'Corporate',
            data: perf.facilityTotals.map(t => t.savings),
            color: '17202A',
            lineDash: 'dash' as const,
            lineSize: 2
        };
        return {
            type: 'chart',
            title: 'Savings by Facility',
            chartType: 'line',
            valAxisLabelFormatCode: '0"%"',
            valAxisMajorUnit: 2,
            valAxisMinVal: this.calculateAxisMin(allValues),
            labels: years,
            showLegend: true,
            series: [
                ...facilitySeries,
                corporateSeries
            ]
        };
    }

    getEnergyColumns(analysisTableColumns: AnalysisTableColumns, isMonthly?: boolean): Array<string | TableHeaderCell> {
        const headers: Array<string | TableHeaderCell> = [];
        if (isMonthly) {
            headers.push('Date');
            headers.push('Period');
        }
        else {
            headers.push('Year');
        }

        if (analysisTableColumns.actualEnergy) {
            headers.push('Actual');
        }
        if (analysisTableColumns.adjusted) {
            headers.push('Adjusted');
        }
        if (analysisTableColumns.baselineAdjustmentForNormalization) {
            headers.push('Baseline Adjustment for Normalization');
        }
        if (analysisTableColumns.baselineAdjustmentForOther) {
            headers.push('Baseline Adjustment for Other');
        }
        if (analysisTableColumns.baselineAdjustment) {
            headers.push('Total Baseline Adjustment');
        }
        return headers;
    }

    getSavingsColumns(analysisTableColumns: AnalysisTableColumns, isMonthly?: boolean): Array<string | TableHeaderCell> {
        const headers: Array<string | TableHeaderCell> = [];
        if (isMonthly) {
            headers.push('Date');
            headers.push('Period');
        }
        else {
            headers.push('Year');
        }
        if (analysisTableColumns.SEnPI) {
            headers.push('SEnPI');
        }
        if (analysisTableColumns.bankedSavings) {
            headers.push('Banked Savings');
        }
        if (analysisTableColumns.savingsUnbanked) {
            headers.push('Unbanked Savings');
        }
        if (analysisTableColumns.savings) {
            headers.push('Savings');
        }
        if (isMonthly) {
            if (analysisTableColumns.rollingSavings) {
                headers.push('Rolling Savings');
            }
            if (analysisTableColumns.rolling12MonthImprovement) {
                headers.push('Rolling 12-Month Improvement');
            }
        }
        else {
            if (analysisTableColumns.totalSavingsPercentImprovement) {
                headers.push('Total Savings % Improvement');
            }
            if (analysisTableColumns.newSavings) {
                headers.push('New Savings');
            }
            if (analysisTableColumns.annualSavingsPercentImprovement) {
                headers.push('Annual Savings % Improvement');
            }
            if (analysisTableColumns.cummulativeSavings) {
                headers.push('Cumulative Savings');
            }
        }
        return headers;
    }

    private formatValue(value: number, isCurrrency: boolean): string {
        if (value === null || isNaN(value) || value === 0 || value === undefined)
            return '—';
        return this.customNumberPipe.transform(value, isCurrrency);
    }

    private formatPercent(value: number): string {
        if (value == null || isNaN(value) || value === 0 || value === undefined)
            return '—';
        return `${value.toFixed(2)}%`;
    }

    private calculateAxisMin(values: number[]): number {
        const valid = values.filter(v => isFinite(v) && !isNaN(v));
        const min = valid.length ? Math.min(...valid) : 0;
        if (min === 0) return 0;
        const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(min))));
        return Math.floor(min / magnitude) * magnitude;
    }
}