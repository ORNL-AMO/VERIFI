import { inject, Injectable } from '@angular/core';
import { AnalysisGroup, AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { PptSlide, TableSlide, ChartSlide, TableHeaderCell, getPptAxisSpec } from 'src/app/shared/ppt-report/models/ppt-slide';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';
import { IdbFacilityReport, SavingsFacilityReportSettings } from 'src/app/models/idbModels/facilityReport';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';

export interface FacilitySavingsReportPptInput {
    facility: IdbFacility;
    report: IdbFacilityReport;
    analysisItem: IdbAnalysisItem;
    annualAnalysisSummaries: Array<AnnualAnalysisSummary>;
    monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>;
    groupSummaries: Array<{
        group: AnalysisGroup,
        monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>,
        annualAnalysisSummaryData: Array<AnnualAnalysisSummary>,
        latestMonthGroupSummary: MonthlyAnalysisSummaryData
    }>;
    latestMonthSummary: MonthlyAnalysisSummaryData;
    analysisTableColumns: AnalysisTableColumns;
}

@Injectable({ providedIn: 'root' })
export class FacilitySavingsReportPptAdapter {
    customNumberPipe: CustomNumberPipe = inject(CustomNumberPipe);
    utilityMeterGroupDbService = inject(UtilityMeterGroupdbService);

    analysisTableColumns: AnalysisTableColumns;
    analysisItem: IdbAnalysisItem;
    reportSettings: SavingsFacilityReportSettings;

    buildDocument(data: FacilitySavingsReportPptInput): PptDocument {
        const slides: PptSlide[] = [];
        const unit = data.analysisItem.analysisCategory === 'water' ? data.analysisItem.waterUnit : data.analysisItem.energyUnit;
        this.analysisTableColumns = data.analysisTableColumns;
        this.analysisItem = data.analysisItem;
        this.reportSettings = data.report.savingsReportSettings;
        slides.push({
            type: 'title',
            title: data.report.name,
            subtitle: data.facility.name,
            date: new Date().toISOString(),
        });

        if (this.reportSettings.facilityAnnualResults && ((this.reportSettings.facilityAnnualResultsTable) || (this.reportSettings.facilityMonthlyResults && (this.reportSettings.facilityMonthlyResultsTable || this.reportSettings.facilityMonthlyResultsGraphs || this.reportSettings.facilityTrailingTwelveMonthsConsumption || this.reportSettings.facilityTrailingTwelveMonthsSavings)))) {
            if (this.reportSettings.facilityAnnualResultsTable && data.annualAnalysisSummaries?.length) {
                if (this.analysisTableColumns.actualEnergy || this.analysisTableColumns.adjusted || this.analysisTableColumns.baselineAdjustmentForNormalization || this.analysisTableColumns.baselineAdjustmentForOther || this.analysisTableColumns.baselineAdjustment) {
                    slides.push(this.buildAnnualConsumptionTable(data.annualAnalysisSummaries, data.latestMonthSummary));
                }
                if (this.analysisTableColumns.productionVariables) {
                    slides.push(this.buildAnnualProductionVariablesTable(data.annualAnalysisSummaries, data.latestMonthSummary));
                }
                if (this.analysisTableColumns.SEnPI || this.analysisTableColumns.bankedSavings || this.analysisTableColumns.savingsUnbanked || this.analysisTableColumns.savings || this.analysisTableColumns.totalSavingsPercentImprovement || this.analysisTableColumns.newSavings || this.analysisTableColumns.annualSavingsPercentImprovement || this.analysisTableColumns.cummulativeSavings) {
                    slides.push(this.buildAnnualSavingsTable(data.annualAnalysisSummaries, data.latestMonthSummary));
                }
            }
            if (this.reportSettings.facilityMonthlyResults && (this.reportSettings.facilityMonthlyResultsTable || this.reportSettings.facilityMonthlyResultsGraphs || this.reportSettings.facilityTrailingTwelveMonthsConsumption || this.reportSettings.facilityTrailingTwelveMonthsSavings)) {
                if (this.reportSettings.facilityMonthlyResultsTable && data.monthlyAnalysisSummaryData?.length) {
                    const years = this.groupMonthlyDataByYear(data.monthlyAnalysisSummaryData);

                    const includeConsumption =
                        this.analysisTableColumns.actualEnergy ||
                        this.analysisTableColumns.adjusted ||
                        this.analysisTableColumns.baselineAdjustmentForNormalization ||
                        this.analysisTableColumns.baselineAdjustmentForOther ||
                        this.analysisTableColumns.baselineAdjustment;

                    const includePredictors =
                        this.analysisTableColumns.productionVariables &&
                        this.getPredictorColumns().length > 0;

                    const includeSavings =
                        this.analysisTableColumns.SEnPI ||
                        this.analysisTableColumns.bankedSavings ||
                        this.analysisTableColumns.savingsUnbanked ||
                        this.analysisTableColumns.savings ||
                        this.analysisTableColumns.rollingSavings ||
                        this.analysisTableColumns.rolling12MonthImprovement;

                    if (includeConsumption) {
                        years.forEach(({ year, rows }) => {
                            slides.push(this.buildMonthlyConsumptionTable(rows, false));
                        });
                    }

                    if (includePredictors) {
                        years.forEach(({ year, rows }) => {
                            slides.push(this.buildMonthlyProductionVariablesTable(rows));
                        });
                    }

                    if (includeSavings) {
                        years.forEach(({ year, rows }) => {
                            slides.push(this.buildMonthlySavingsTable(rows));
                        });
                    }
                }
                if (this.reportSettings.facilityMonthlyResultsGraphs && data.monthlyAnalysisSummaryData?.length) {
                    slides.push(this.buildMonthlyConsumptionChart(data.monthlyAnalysisSummaryData, unit));
                    slides.push(this.buildMonthlySavingsChart(data.monthlyAnalysisSummaryData));
                }
                if (this.reportSettings.facilityTrailingTwelveMonthsConsumption && data.monthlyAnalysisSummaryData?.length) {
                    slides.push(this.buildTrailingTwelveMonthsConsumptionChart(data.monthlyAnalysisSummaryData, unit));
                }
                if (this.reportSettings.facilityTrailingTwelveMonthsSavings && data.monthlyAnalysisSummaryData?.length) {
                    slides.push(this.buildTrailingTwelveMonthsSavingsChart(data.monthlyAnalysisSummaryData));
                }
            }
        }

        if (this.reportSettings.groupReports && ((this.reportSettings.groupAnnualResultsTable) || (this.reportSettings.groupMonthlyResults && (this.reportSettings.groupMonthlyResultsTable || this.reportSettings.groupMonthlyResultsGraphs || this.reportSettings.groupTrailingTwelveMonthsConsumption || this.reportSettings.groupTrailingTwelveMonthsSavings)))) {
            data.groupSummaries.forEach(groupSummary => {
                const groupName = this.utilityMeterGroupDbService.getGroupName(groupSummary.group.idbGroupId);
                slides.push({
                    type: 'title',
                    title: `${groupName}\nGroup Analysis`,
                    layout: 'section'
                });
                if (this.reportSettings.groupAnnualResultsTable && groupSummary.annualAnalysisSummaryData?.length) {
                    if (this.analysisTableColumns.actualEnergy || this.analysisTableColumns.adjusted || this.analysisTableColumns.baselineAdjustmentForNormalization || this.analysisTableColumns.baselineAdjustmentForOther || this.analysisTableColumns.baselineAdjustment) {
                        slides.push(this.buildAnnualConsumptionTable(groupSummary.annualAnalysisSummaryData, groupSummary.latestMonthGroupSummary));
                    }
                    if (this.analysisTableColumns.productionVariables) {
                        slides.push(this.buildAnnualProductionVariablesTable(groupSummary.annualAnalysisSummaryData, groupSummary.latestMonthGroupSummary));
                    }
                    if (this.analysisTableColumns.SEnPI || this.analysisTableColumns.bankedSavings || this.analysisTableColumns.savingsUnbanked || this.analysisTableColumns.savings || this.analysisTableColumns.totalSavingsPercentImprovement || this.analysisTableColumns.newSavings || this.analysisTableColumns.annualSavingsPercentImprovement || this.analysisTableColumns.cummulativeSavings) {
                        slides.push(this.buildAnnualSavingsTable(groupSummary.annualAnalysisSummaryData, groupSummary.latestMonthGroupSummary));
                    }
                }
                if (this.reportSettings.groupMonthlyResults && (this.reportSettings.groupMonthlyResultsTable || this.reportSettings.groupMonthlyResultsGraphs || this.reportSettings.groupTrailingTwelveMonthsConsumption || this.reportSettings.groupTrailingTwelveMonthsSavings)) {
                    if (this.reportSettings.groupMonthlyResultsTable && groupSummary.monthlyAnalysisSummaryData?.length) {
                        const years = this.groupMonthlyDataByYear(groupSummary.monthlyAnalysisSummaryData);

                        const includeConsumption =
                            this.analysisTableColumns.actualEnergy ||
                            this.analysisTableColumns.adjusted ||
                            this.analysisTableColumns.baselineAdjustmentForNormalization ||
                            this.analysisTableColumns.baselineAdjustmentForOther ||
                            this.analysisTableColumns.baselineAdjustment;

                        const includePredictors =
                            this.analysisTableColumns.productionVariables &&
                            this.getPredictorColumns().length > 0;

                        const includeSavings =
                            this.analysisTableColumns.SEnPI ||
                            this.analysisTableColumns.bankedSavings ||
                            this.analysisTableColumns.savingsUnbanked ||
                            this.analysisTableColumns.savings ||
                            this.analysisTableColumns.rollingSavings ||
                            this.analysisTableColumns.rolling12MonthImprovement;

                        if (includeConsumption) {
                            years.forEach(({ year, rows }) => {
                                slides.push(this.buildMonthlyConsumptionTable(rows, true));
                            });
                        }

                        if (includePredictors) {
                            years.forEach(({ year, rows }) => {
                                slides.push(this.buildMonthlyProductionVariablesTable(rows));
                            });
                        }

                        if (includeSavings) {
                            years.forEach(({ year, rows }) => {
                                slides.push(this.buildMonthlySavingsTable(rows));
                            });
                        }
                    }
                    if (this.reportSettings.groupMonthlyResultsGraphs && groupSummary.monthlyAnalysisSummaryData?.length) {
                        slides.push(this.buildMonthlyConsumptionChart(groupSummary.monthlyAnalysisSummaryData, unit));
                        slides.push(this.buildMonthlySavingsChart(groupSummary.monthlyAnalysisSummaryData));
                    }
                    if (this.reportSettings.groupTrailingTwelveMonthsConsumption && groupSummary.monthlyAnalysisSummaryData?.length) {
                        slides.push(this.buildTrailingTwelveMonthsConsumptionChart(groupSummary.monthlyAnalysisSummaryData, unit));
                    }
                    if (this.reportSettings.groupTrailingTwelveMonthsSavings && groupSummary.monthlyAnalysisSummaryData?.length) {
                        slides.push(this.buildTrailingTwelveMonthsSavingsChart(groupSummary.monthlyAnalysisSummaryData));
                    }
                }
            });
        }

        return {
            metadata: { title: data.report.name, subtitle: data.facility.name },
            slides,
        };
    }

    private buildAnnualConsumptionTable(summaries: Array<AnnualAnalysisSummary>, latestMonthSummary: MonthlyAnalysisSummaryData): TableSlide {
        const title = 'Annual Facility Analysis — Consumption';
        const subHeaders: Array<string | TableHeaderCell> = this.getEnergyColumns();
        const energyColCount = subHeaders.length - 1;
        let rows: string[][] = [];
        summaries.forEach(s => {
            let row: string[] = [];
            row.push(s.year.toString());
            if (this.analysisTableColumns.actualEnergy) {
                row.push(this.formatValue(s.energyUse, false));
            }
            if (this.analysisTableColumns.adjusted) {
                row.push(this.formatValue(s.adjusted, false));
            }
            if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
                row.push(this.formatValue(s.baselineAdjustmentForNormalization, false));
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
        if (this.analysisTableColumns.actualEnergy) {
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
                { content: this.analysisItem.analysisCategory === 'water' ? `Consumption (${this.analysisItem.waterUnit})` : `Energy (${this.analysisItem.energyUnit})`, colspan: energyColCount }
            ],
            subHeaders,
            rows: rows,
            note: '* This represents the rolling 12-month energy use and savings for the last month of the report'
        };
    }

    private buildAnnualProductionVariablesTable(summaries: Array<AnnualAnalysisSummary>, latestMonthSummary: MonthlyAnalysisSummaryData): TableSlide {
        const title = 'Annual Facility Analysis — Production Variables';
        const headers: Array<string | TableHeaderCell> = [];
        let subHeaders: Array<string | TableHeaderCell> = [];
        const rows: string[][] = [];
        const predictors = this.getPredictorColumns();

        subHeaders = [
            'Year',
            ...predictors
        ];
        headers.push({ content: '', colspan: 1 });
        headers.push({ content: 'Production Variables', colspan: predictors.length });

        summaries.forEach(s => {
            let row: string[] = [];
            row.push(s.year.toString());
            predictors.forEach(predictorItem => {
                row.push(this.formatValue(s[predictorItem], false));
            });
            rows.push(row);
        });

        const latestRow: string[] = [];
        latestRow.push(latestMonthSummary.date.toLocaleString('en-US', { month: 'short', year: 'numeric' }) + ' *');
        predictors.forEach(predictorItem => {
            latestRow.push(this.formatValue(latestMonthSummary[predictorItem], false));
        });
        rows.push(latestRow);

        return {
            type: 'table',
            title,
            headers: headers,
            subHeaders: subHeaders,
            rows: rows,
            note: '* This represents the rolling 12-month energy use and savings for the last month of the report'
        };
    }

    private buildAnnualSavingsTable(summaries: Array<AnnualAnalysisSummary>, latestMonthSummary: MonthlyAnalysisSummaryData): TableSlide {
        const title = 'Annual Facility Analysis — Savings';
        const subHeaders: Array<string | TableHeaderCell> = this.getSavingsColumns();
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

    private buildMonthlyConsumptionTable(data: Array<MonthlyAnalysisSummaryData>, isGroup: boolean): TableSlide {
        const title = 'Monthly Facility Analysis — Consumption';
        const subHeaders: Array<string | TableHeaderCell> = this.getEnergyColumns(true, isGroup);
        const energyColCount = subHeaders.length - 2;
        let rows: string[][] = [];
        data.forEach(s => {
            let row: string[] = [];
            row.push(s.date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
            row.push(s.fiscalYear.toString());
            if (this.analysisTableColumns.actualEnergy) {
                row.push(this.formatValue(s.energyUse, false));
            }
            if (this.analysisTableColumns.modeledEnergy && isGroup) {
                row.push(this.formatValue(s.modeledEnergy, false));
            }
            if (this.analysisTableColumns.adjusted) {
                row.push(this.formatValue(s.adjusted, false));
            }
            if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
                row.push(this.formatValue(s.baselineAdjustmentForNormalization, false));
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
                { content: this.analysisItem.analysisCategory === 'water' ? `Consumption (${this.analysisItem.waterUnit})` : `Energy (${this.analysisItem.energyUnit})`, colspan: energyColCount }
            ],
            subHeaders,
            rows: rows
        };
    }

    private buildMonthlyProductionVariablesTable(data: Array<MonthlyAnalysisSummaryData>): TableSlide {
        const title = 'Monthly Facility Analysis — Production Variables';
        const headers: Array<string | TableHeaderCell> = [];
        let subHeaders: Array<string | TableHeaderCell> = [];
        const rows: string[][] = [];
        const predictors = this.getPredictorColumns();

        headers.push({ content: '', colspan: 2 });
        headers.push({ content: 'Production Variables', colspan: predictors.length });
        subHeaders = [
            'Date',
            'Period',
            ...predictors
        ];

        data.forEach(s => {
            let row: string[] = [];
            row.push(s.date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
            row.push(s.fiscalYear.toString());
            predictors.forEach(predictorItem => {
                row.push(this.formatValue(s[predictorItem], false));
            });
            rows.push(row);
        });

        return {
            type: 'table',
            title,
            headers: headers,
            subHeaders: subHeaders,
            rows: rows
        };
    }

    private buildMonthlySavingsTable(data: Array<MonthlyAnalysisSummaryData>): TableSlide {
        const title = 'Monthly Facility Analysis — Savings';
        const subHeaders: Array<string | TableHeaderCell> = this.getSavingsColumns(true);
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

    private buildMonthlyConsumptionChart(data: Array<MonthlyAnalysisSummaryData>, unit: string): ChartSlide {
        const isWater = this.analysisItem.analysisCategory === 'water';
        const label1 = isWater ? 'Actual Water Consumption' : 'Actual Energy Use';
        const label2 = isWater ? 'Calculated Water Consumption' : 'Calculated Energy Use';
        const allValues = data.flatMap(m => [m.energyUse ?? 0, m.adjusted ?? 0]).filter(v => isFinite(v) && !isNaN(v));
        const axis = getPptAxisSpec(allValues);
        return {
            type: 'chart',
            title: 'Monthly Facility Analysis',
            chartType: 'line',
            labels: data.map(m => m.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })),
            yAxisUnit: unit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
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

    private buildMonthlySavingsChart(data: Array<MonthlyAnalysisSummaryData>): ChartSlide {
        const allValues = data.flatMap(m => [m.rolling12MonthImprovement ?? 0]).filter(v => isFinite(v) && !isNaN(v));
        const axis = getPptAxisSpec(allValues, {isPercent: true});
        return {
            type: 'chart',
            title: 'Monthly Facility Savings',
            chartType: 'bar',
            labels: data.map(m => m.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })),
            yAxisUnit: 'Percent Savings',
            //valAxisLabelFormatCode: '0"%"',
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
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

    private buildTrailingTwelveMonthsConsumptionChart(data: Array<MonthlyAnalysisSummaryData>, unit: string): ChartSlide {
        const skip = 12;
        const sliced = data.slice(skip);

        const labels = sliced.map(m =>
            m.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        );

        const allValues = sliced.flatMap(m => [
            m.rollingActual ?? 0,
            m.twentyFivePercentTarget ?? 0,
            m.twentyPercentTarget ?? 0,
            m.fifteenPercentTarget ?? 0,
            m.tenPercentTarget ?? 0,
            m.fivePercentTarget ?? 0
        ]).filter(v => isFinite(v) && !isNaN(v));

        const isWater = this.analysisItem.analysisCategory === 'water';
        const title = isWater ? 'Trailing 12-Month Actual Water Consumption' : 'Trailing 12-Month Actual Energy Consumption';

        const band25 = sliced.map(m => Math.max((m.twentyFivePercentTarget ?? 0), 0));
        const band20 = sliced.map(m => Math.max((m.twentyPercentTarget ?? 0) - (m.twentyFivePercentTarget ?? 0), 0));
        const band15 = sliced.map(m => Math.max((m.fifteenPercentTarget ?? 0) - (m.twentyPercentTarget ?? 0), 0));
        const band10 = sliced.map(m => Math.max((m.tenPercentTarget ?? 0) - (m.fifteenPercentTarget ?? 0), 0));
        const band5 = sliced.map(m => Math.max((m.fivePercentTarget ?? 0) - (m.tenPercentTarget ?? 0), 0));

        const axis = getPptAxisSpec(allValues);
        return {
            type: 'chart',
            title,
            chartType: 'combo',
            labels,
            yAxisUnit: unit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true,
            series: [
                { name: '25% Target', type: 'area', data: band25, color: '6DA06D' },
                { name: '20% Target', type: 'area', data: band20, color: '8ABC8A' },
                { name: '15% Target', type: 'area', data: band15, color: 'A9D3A9' },
                { name: '10% Target', type: 'area', data: band10, color: 'C6E2C6' },
                { name: '5% Target', type: 'area', data: band5, color: 'E0F2E0' },
                {
                    name: isWater ? 'Actual Water Consumption' : 'Actual Energy Consumption',
                    type: 'line',
                    data: sliced.map(m => m.rollingActual ?? 0),
                    color: '063970'
                }
            ]
        };
    }

    private buildTrailingTwelveMonthsSavingsChart(data: Array<MonthlyAnalysisSummaryData>): ChartSlide {
        const skip = 12;
        const sliced = data.slice(skip);

        const labels = sliced.map(m =>
            m.date.toLocaleString('en-US', { month: 'short', year: 'numeric' })
        );

        const rolling = sliced.map(m => m.rollingSavings ?? 0);
        const target5 = sliced.map(m => m.fivePercentSavings ?? 0);
        const target10 = sliced.map(m => m.tenPercentSavings ?? 0);
        const target15 = sliced.map(m => m.fifteenPercentSavings ?? 0);
        const target20 = sliced.map(m => m.twentyPercentSavings ?? 0);
        const target25 = sliced.map(m => m.twentyFivePercentSavings ?? 0);
        const target30 = sliced.map(m => m.thirtyPercentSavings ?? 0);

        const rollingForComparison = rolling.map(v => v * 1.3);
        const maxTarget = Math.max(...target30, ...rollingForComparison, 0);

        const baseBand = target5;
        const band5 = target10.map((v, i) => Math.max(v - target5[i], 0));
        const band10 = target15.map((v, i) => Math.max(v - target10[i], 0));
        const band15 = target20.map((v, i) => Math.max(v - target15[i], 0));
        const band20 = target25.map((v, i) => Math.max(v - target20[i], 0));
        const band25 = target25.map(v => Math.max(maxTarget - v, 0));

        const allValues = [...rolling, ...target5, ...target10, ...target15, ...target20, ...target25, maxTarget]
            .filter(v => isFinite(v) && !isNaN(v));

        const isWater = this.analysisItem.analysisCategory === 'water';
        const title = isWater ? 'Trailing 12-Month Actual Water Savings' : 'Trailing 12-Month Actual Energy Savings';
        const axis = getPptAxisSpec(allValues);
        return {
            type: 'chart',
            title,
            chartType: 'combo',
            labels,
            yAxisUnit: isWater ? this.analysisItem.waterUnit : this.analysisItem.energyUnit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true,
            series: [
                { name: '', type: 'area', data: baseBand, color: 'FFFFFF' },
                { name: '5% Target', type: 'area', data: band5, color: 'E2E8F0' },
                { name: '10% Target', type: 'area', data: band10, color: 'C0CBE0' },
                { name: '15% Target', type: 'area', data: band15, color: '9AAACC' },
                { name: '20% Target', type: 'area', data: band20, color: '7A8BB5' },
                { name: '25% Target', type: 'area', data: band25, color: '5A6D99' },
                {
                    name: isWater ? 'Actual Water Savings' : 'Actual Energy Savings',
                    type: 'line',
                    data: rolling,
                    color: '063970'
                }
            ],
        };
    }

    getEnergyColumns(isMonthly?: boolean, isGroup?: boolean): Array<string | TableHeaderCell> {
        const headers: Array<string | TableHeaderCell> = [];
        if (isMonthly) {
            headers.push('Date');
            headers.push('Period');
        }
        else {
            headers.push('Year');
        }

        if (this.analysisTableColumns.actualEnergy) {
            headers.push('Actual');
        }
        if (isMonthly && isGroup && this.analysisTableColumns.modeledEnergy) {
            headers.push('Modeled');
        }
        if (this.analysisTableColumns.adjusted) {
            headers.push('Adjusted');
        }
        if (this.analysisTableColumns.baselineAdjustmentForNormalization) {
            headers.push('Baseline Adjustment for Normalization');
        }
        if (this.analysisTableColumns.baselineAdjustmentForOther) {
            headers.push('Baseline Adjustment for Other');
        }
        if (this.analysisTableColumns.baselineAdjustment) {
            headers.push('Total Baseline Adjustment');
        }
        return headers;
    }

    getSavingsColumns(isMonthly?: boolean): Array<string | TableHeaderCell> {
        const headers: Array<string | TableHeaderCell> = [];
        if (isMonthly) {
            headers.push('Date');
            headers.push('Period');
        }
        else {
            headers.push('Year');
        }
        if (this.analysisTableColumns.SEnPI) {
            headers.push('SEnPI');
        }
        if (this.analysisTableColumns.bankedSavings) {
            headers.push('Banked Savings');
        }
        if (this.analysisTableColumns.savingsUnbanked) {
            headers.push('Unbanked Savings');
        }
        if (this.analysisTableColumns.savings) {
            headers.push('Savings');
        }
        if (isMonthly) {
            if (this.analysisTableColumns.rollingSavings) {
                headers.push('Rolling Savings');
            }
            if (this.analysisTableColumns.rolling12MonthImprovement) {
                headers.push('Rolling 12-Month Improvement');
            }
        }
        else {
            if (this.analysisTableColumns.totalSavingsPercentImprovement) {
                headers.push('Total Savings % Improvement');
            }
            if (this.analysisTableColumns.newSavings) {
                headers.push('New Savings');
            }
            if (this.analysisTableColumns.annualSavingsPercentImprovement) {
                headers.push('Annual Savings % Improvement');
            }
            if (this.analysisTableColumns.cummulativeSavings) {
                headers.push('Cumulative Savings');
            }
        }
        return headers;
    }

    getPredictorColumns() {
        let predictors: string[] = [];
        this.analysisTableColumns.predictors.forEach(predictorItem => {
            if (predictorItem.display) {
                predictors.push(predictorItem.predictor.name);
            }
        });
        return predictors;
    }

    groupMonthlyDataByYear(data: Array<MonthlyAnalysisSummaryData>): Array<{ year: number, rows: Array<MonthlyAnalysisSummaryData> }> {
        const dataByYear: { [year: number]: Array<MonthlyAnalysisSummaryData> } = {};
        data.forEach(monthlyData => {
            const year = monthlyData.fiscalYear ?? monthlyData.date.getFullYear();
            if (!dataByYear[year]) {
                dataByYear[year] = [];
            }
            dataByYear[year].push(monthlyData);
        });
        return Object.keys(dataByYear).map(year => ({
            year: Number(year),
            rows: dataByYear[Number(year)]
        }));
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
}