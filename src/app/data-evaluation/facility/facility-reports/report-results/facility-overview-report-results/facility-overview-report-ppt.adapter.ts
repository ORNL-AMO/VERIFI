import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { inject, Injectable } from '@angular/core';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { PptSlide, TableSlide, ChartSlide, TableHeaderCell, getPptAxisSpec, PptChartSeries } from 'src/app/shared/ppt-report/models/ppt-slide';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IUseAndCost, UseAndCost, UtilityUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { AnnualSourceData, FacilityOverviewData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { AllSources, EnergySources, MeterSource, WaterSources } from 'src/app/models/constantsAndTypes';
import { YearMonthData } from 'src/app/models/dashboard';
import { Month, Months } from 'src/app/shared/form-data/months';

export interface FacilityOverviewReportPptInput {
    facility: IdbFacility;
    report: IdbFacilityReport;
    facilityOverviewData: FacilityOverviewData;
    utilityUseAndCost: UtilityUseAndCost;
    dateRange: {
        startDate: Date,
        endDate: Date
    };
}

@Injectable({ providedIn: 'root' })
export class FacilityOverviewReportPptAdapter {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
    customNumberPipe: CustomNumberPipe = inject(CustomNumberPipe);

    reportSettings: DataOverviewFacilityReportSettings;
    facility: IdbFacility;
    dateRange: { startDate: Date, endDate: Date };
    facilityOverviewData: FacilityOverviewData;
    utilityUseAndCost: UtilityUseAndCost;
    chartSeriesPalette: string[] = [
        '1F77B4', 'FF7F0E', '2CA02C', 'D62728', '9467BD', '8C564B',
        'E377C2', '7F7F7F', 'BCBD22', '17BECF', '4E79A7', 'F28E2B'
    ];

    buildDocument(data: FacilityOverviewReportPptInput): PptDocument {
        const slides: PptSlide[] = [];
        this.reportSettings = data.report.dataOverviewReportSettings;
        slides.push({
            type: 'title',
            title: data.report.name,
            subtitle: data.facility.name,
            date: new Date().toISOString(),
        });
        this.facility = data.facility;
        this.dateRange = data.dateRange;
        this.facilityOverviewData = data.facilityOverviewData;
        this.utilityUseAndCost = data.utilityUseAndCost;

        if (this.reportSettings.includeEnergySection) {
            const energySlides: PptSlide[] = [];
            this.buildReportSections(energySlides, 'energyUse');
            if (energySlides.length > 0) {
                slides.push({
                    type: 'title',
                    title: 'Energy Consumption',
                    layout: 'section'
                });
                slides.push(...energySlides);
            }
        }
        if (this.reportSettings.includeWaterSection) {
            const waterSlides: PptSlide[] = [];
            this.buildReportSections(waterSlides, 'water');
            if (waterSlides.length > 0) {
                slides.push({
                    type: 'title',
                    title: 'Water',
                    layout: 'section'
                });
                slides.push(...waterSlides);
            }
        }
        if (this.reportSettings.includeCostsSection) {
            const costSlides: PptSlide[] = [];
            this.buildReportSections(costSlides, 'cost');
            if (costSlides.length > 0) {
                slides.push({
                    type: 'title',
                    title: 'Costs',
                    layout: 'section'
                });
                slides.push(...costSlides);
            }
        }
        return {
            metadata: { title: data.report.name, subtitle: data.facility.name },
            slides,
        };
    }

    private buildReportSections(slides: PptSlide[], sectionType: 'energyUse' | 'cost' | 'water') {
        const facilityOverviewMeters = sectionType === 'energyUse' ? this.facilityOverviewData.energyMeters : sectionType === 'water' ? this.facilityOverviewData.waterMeters : this.facilityOverviewData.costMeters;
        if (this.reportSettings.includeMeterUsageStackedLineChart && this.facilityOverviewData.calanderizedMeters?.length > 0) {
            const chartSlide: ChartSlide = this.buildStackedLineChart(sectionType);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        if (this.reportSettings.includeMeterUsageTable && this.facilityOverviewData.calanderizedMeters?.length > 0 && facilityOverviewMeters?.length > 0) {
            const tableSlide: TableSlide = this.buildMeterUsageTable(sectionType, facilityOverviewMeters);
            if (tableSlide) {
                slides.push(tableSlide);
            }
        }
        if (this.reportSettings.includeMeterUsageDonut && facilityOverviewMeters?.length > 0) {
            const chartSlide: ChartSlide = this.buildMeterUsageDonutChart(sectionType, facilityOverviewMeters);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        let sourcesUseAndCost: Array<UseAndCost> = [];
        let useAndCostTotal: { end: IUseAndCost; average: IUseAndCost; previousYear: IUseAndCost; } = null;
        if (sectionType === 'energyUse') {
            sourcesUseAndCost = this.utilityUseAndCost.energyUseAndCost;
            useAndCostTotal = this.utilityUseAndCost.energyTotal;
        }
        if (sectionType === 'water') {
            sourcesUseAndCost = this.utilityUseAndCost.waterUseAndCost;
            useAndCostTotal = this.utilityUseAndCost.waterTotal;
        }
        if (sectionType === 'cost') {
            sourcesUseAndCost = this.utilityUseAndCost.allSourcesUseAndCost;
            useAndCostTotal = this.utilityUseAndCost.allSourcesTotal;
        }
        if (this.reportSettings.includeUtilityTableForFacility && sourcesUseAndCost?.length > 0 && useAndCostTotal) {
            if (sectionType === 'energyUse' || sectionType === 'water') {
                const tableSlide: TableSlide = this.buildUtilityConsumptionTable(sectionType, sourcesUseAndCost, useAndCostTotal, this.utilityUseAndCost.previousYear);
                if (tableSlide) {
                    slides.push(tableSlide);
                }
            }
            if (sectionType === 'cost') {
                const tableSlide: TableSlide = this.buildUtilityConsumptionCostTable(sourcesUseAndCost, useAndCostTotal, this.utilityUseAndCost.previousYear);
                if (tableSlide) {
                    slides.push(tableSlide);
                }
            }
        }
        if (this.reportSettings.includeAnnualBarChart && this.facilityOverviewData.annualSourceData?.length > 0) {
            const annualBarChartSlide: ChartSlide = this.buildAnnualBarChart(sectionType, this.facilityOverviewData.annualSourceData);
            if (annualBarChartSlide) {
                slides.push(annualBarChartSlide);
            }
        }
        const yearMonthData = sectionType === 'energyUse' ? this.facilityOverviewData.energyYearMonthData : sectionType === 'water' ? this.facilityOverviewData.waterYearMonthData : this.facilityOverviewData.allSourcesYearMonthData;
        if (this.reportSettings.includeMonthlyLineChartForFacility && yearMonthData?.length > 0) {
            const monthlyLineChartSlide: ChartSlide = this.buildMonthlyLineChart(sectionType, yearMonthData);
            if (monthlyLineChartSlide) {
                slides.push(monthlyLineChartSlide);
            }
        }
    }

    private buildStackedLineChart(sectionType: 'energyUse' | 'cost' | 'water'): ChartSlide {
        const includedSources: Array<MeterSource> = sectionType === 'energyUse' ? EnergySources : sectionType === 'water' ? WaterSources : AllSources;

        const filteredMeters = _.orderBy(
            this.facilityOverviewData.calanderizedMeters.filter(cMeter => {
                if (!includedSources.includes(cMeter.meter.source)) return false;
                return sectionType === 'energyUse' ? cMeter.meter.includeInEnergy : true;
            }),
            cMeter => cMeter.meter.source
        );

        if (!filteredMeters.length) return null;

        const allKeys = new Set<string>();
        filteredMeters.forEach(cMeter => {
            cMeter.monthlyData.forEach(d => {
                const date = new Date(d.date);
                if (date >= this.dateRange.startDate && date <= this.dateRange.endDate) {
                    allKeys.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
                }
            });
        });

        const sortedKeys = Array.from(allKeys).sort();
        const labels = sortedKeys.map(k => {
            const [y, m] = k.split('-');
            return new Date(+y, +m - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        });

        const series: PptChartSeries[] = filteredMeters.map(cMeter => {
            const valueByKey = new Map<string, number>();
            cMeter.monthlyData.forEach(d => {
                const date = new Date(d.date);
                if (date >= this.dateRange.startDate && date <= this.dateRange.endDate) {
                    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const value = sectionType === 'cost' ? d.energyCost : sectionType === 'water' ? d.energyConsumption : d.energyUse;
                    valueByKey.set(key, value ?? 0);
                }
            });
            return {
                name: cMeter.meter.name,
                type: 'area',
                data: sortedKeys.map(k => valueByKey.get(k) ?? 0),
                color: UtilityColors[cMeter.meter.source]?.color?.replace('#', '') ?? '999999'
            };
        });

        const stackedTotals = sortedKeys.map((i) => series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
        const axis = getPptAxisSpec(stackedTotals.filter(v => isFinite(v) && !isNaN(v)));
        const yAxisUnit = sectionType === 'water' ? this.facility.volumeLiquidUnit : sectionType === 'cost' ? 'Cost ($)' : this.facility.energyUnit;

        return {
            type: 'chart',
            title: sectionType === 'water' ? `Water Usage (${yAxisUnit})` : sectionType === 'cost' ? 'Utility Costs' : `Utility Usage (${yAxisUnit})`,
            chartType: 'combo',
            labels,
            series,
            yAxisUnit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true
        };
    }

    private buildMeterUsageTable(sectionType: 'energyUse' | 'cost' | 'water', facilityOverviewMeters: Array<FacilityOverviewMeter>): TableSlide {
        const title = 'Utility Usage Breakdown';
        let headers = ['Meter', 'Utility', 'Group'];
        if (sectionType === 'energyUse') {
            headers.push(`Utility Usage (${this.facility.energyUnit})`);
        }
        if (sectionType === 'water') {
            headers.push(`Consumption (${this.facility.volumeLiquidUnit})`);
        }
        headers.push('Utility Cost');

        let rows: string[][] = [];
        facilityOverviewMeters.forEach(m => {
            let row: string[] = [];
            row.push(m.meter.name);
            row.push(m.meter.source);
            row.push(this.accountWorkspaceQuery.getMeterGroupName(m.meter.groupId) || '-');
            if (sectionType === 'energyUse' || sectionType === 'water') {
                row.push(this.formatValue(m.totalUsage, false));
            }
            row.push(this.formatValue(m.totalCost, true));
            rows.push(row);
        });

        let totalRow: string[] = ['Total', '', ''];
        if (sectionType === 'energyUse') {
            totalRow.push(this.formatValue(this.facilityOverviewData.totalEnergyUsage, false));
            totalRow.push(this.formatValue(this.facilityOverviewData.totalEnergyCost, true));
        }
        if (sectionType === 'water') {
            totalRow.push(this.formatValue(this.facilityOverviewData.totalWaterConsumption, false));
            totalRow.push(this.formatValue(this.facilityOverviewData.totalWaterCost, true));
        }
        if (sectionType === 'cost') {
            totalRow.push(this.formatValue(this.facilityOverviewData.totalFacilityCost, true));
        }
        rows.push(totalRow);
        return {
            type: 'table',
            title,
            headers,
            rows,
        };
    }

    private buildMeterUsageDonutChart(sectionType: 'energyUse' | 'cost' | 'water', facilityOverviewMeters: Array<FacilityOverviewMeter>): ChartSlide {
        const ordered = _.orderBy(facilityOverviewMeters, m => m.meter.source).reverse();
        const values = ordered.map(m => sectionType === 'cost' ? (m.totalCost ?? 0) : (m.totalUsage ?? 0));
        if (values.every(v => v === 0)) return null;
        const total = values.reduce((sum, v) => sum + v, 0);
        const percentages = values.map(v => total > 0 ? (v / total) * 100 : 0);
        const labels = ordered.map((m, i) => `${m.meter.name} (${percentages[i].toFixed(1)}%)`);

        const title = sectionType === 'cost' ? 'Utility Cost Breakdown'
            : sectionType === 'water' ? 'Water Consumption Breakdown'
                : 'Utility Usage Breakdown';
        const yAxisUnit = sectionType === 'cost' ? '$'
            : sectionType === 'water' ? this.facility.volumeLiquidUnit
                : this.facility.energyUnit;

        const axis = getPptAxisSpec(values.filter(v => isFinite(v) && !isNaN(v)));

        return {
            type: 'chart',
            title,
            chartType: 'bar',
            barDir: 'bar',
            labels: labels,
            barColors: ordered.map(m => UtilityColors[m.meter.source]?.color?.replace('#', '') ?? '999999'),
            series: [{ name: yAxisUnit, data: values }],
            yAxisUnit,
            valAxisMinVal: 0,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: false
        };
    }

    private buildUtilityConsumptionTable(sectionType: 'energyUse' | 'water',
        sourcesUseAndCost: Array<UseAndCost>,
        useAndCostTotal: { end: IUseAndCost; average: IUseAndCost; previousYear: IUseAndCost; },
        previousYear: Date): TableSlide {
        const title = 'Utility Usage Comparison';
        const endDate = this.dateRange.endDate ? this.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = previousYear ? previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = this.dateRange.startDate && this.dateRange.endDate ? `${this.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${this.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';
        const unit = sectionType === 'energyUse' ? this.facility.energyUnit : sectionType === 'water' ? this.facility.volumeLiquidUnit : '';
        const headers: Array<string | TableHeaderCell> = [
            { content: '', colspan: 1 },
            { content: `Latest Month\n(${endDate})`, colspan: 2 },
            { content: `Previous Year\n(${previousYearDate})`, colspan: 2 },
            { content: `Monthly Average\n(${averageDate})`, colspan: 2 }
        ];
        const subHeaders = ['Utility', `Utility Use\n(${unit})`, 'Utility Cost', `Utility Use\n(${unit})`, 'Utility Cost', `Utility Use\n(${unit})`, 'Utility Cost'];
        let rows: string[][] = [];
        sourcesUseAndCost.forEach(s => {
            let row: string[] = [];
            row.push(s.source);
            row.push(this.formatValue(s.end?.energyUse, false));
            row.push(this.formatValue(s.end?.cost, true));
            row.push(this.formatValue(s.previousYear?.energyUse, false));
            row.push(this.formatValue(s.previousYear?.cost, true));
            row.push(this.formatValue(s.average?.energyUse, false));
            row.push(this.formatValue(s.average?.cost, true));
            rows.push(row);
        });
        const totalRow: string[] = [
            'Total',
            this.formatValue(useAndCostTotal.end?.energyUse, false),
            this.formatValue(useAndCostTotal.end?.cost, true),
            this.formatValue(useAndCostTotal.previousYear?.energyUse, false),
            this.formatValue(useAndCostTotal.previousYear?.cost, true),
            this.formatValue(useAndCostTotal.average?.energyUse, false),
            this.formatValue(useAndCostTotal.average?.cost, true)
        ];
        rows.push(totalRow);

        return {
            type: 'table',
            title,
            headers,
            subHeaders,
            rows
        };
    }

    private buildUtilityConsumptionCostTable(sourcesUseAndCost: Array<UseAndCost>,
        useAndCostTotal: { end: IUseAndCost; average: IUseAndCost; previousYear: IUseAndCost; },
        previousYear: Date): TableSlide {
        const title = 'Cost Comparison';
        const endDate = this.dateRange.endDate ? this.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = previousYear ? previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = this.dateRange.startDate && this.dateRange.endDate ? `${this.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${this.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';
        const headers = ['Utility', `Latest Month\n(${endDate})`, `Previous Year\n(${previousYearDate})`, `Monthly Average\n(${averageDate})`];
        let rows: string[][] = [];
        sourcesUseAndCost.forEach(s => {
            let row: string[] = [];
            row.push(s.source);
            row.push(this.formatValue(s.end?.cost, true));
            row.push(this.formatValue(s.previousYear?.cost, true));
            row.push(this.formatValue(s.average?.cost, true));
            rows.push(row);
        });
        const totalRow: string[] = [
            'Total',
            this.formatValue(useAndCostTotal.end?.cost, true),
            this.formatValue(useAndCostTotal.previousYear?.cost, true),
            this.formatValue(useAndCostTotal.average?.cost, true)
        ];
        rows.push(totalRow);

        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildAnnualBarChart(sectionType: 'energyUse' | 'cost' | 'water', annualSourceData: Array<AnnualSourceData>): ChartSlide {
        const filteredSources = annualSourceData.filter(sourceData => {
            return this.includeAnnualSource(sourceData, sectionType);
        });
        if (!filteredSources.length) return null;

        const years: Array<number> = _.chain(filteredSources).flatMap(sourceData => sourceData.annualSourceDataItems.map(d => d.fiscalYear)).uniq().sortBy().value();
        if (!years.length) return null;

        const labels: Array<string> = years.map(year => this.facility.fiscalYear === 'nonCalendarYear' ? `FY - ${year}` : year.toString());

        const series: PptChartSeries[] = filteredSources.map(sourceData => {
            const valueByYear = new Map<number, number>();
            sourceData.annualSourceDataItems.forEach(d => {
                valueByYear.set(d.fiscalYear, this.getAnnualSourceValue(d, sectionType));
            });
            return {
                name: sourceData.source,
                data: years.map(year => valueByYear.get(year) ?? 0),
                color: UtilityColors[sourceData.source]?.color?.replace('#', '') ?? '999999'
            };
        });
        const allValues = series.flatMap(s => s.data).filter(v => isFinite(v) && !isNaN(v));
        const axis = getPptAxisSpec(allValues);
        const yAxisUnit = sectionType === 'water' ? `Utility Usage (${this.facility.volumeLiquidUnit})` : sectionType === 'cost' ? 'Utility Costs' : `Utility Usage (${this.facility.energyUnit})`;
        const title = sectionType === 'cost' ? 'Annual Cost' : sectionType === 'energyUse' ? `Annual Energy Use (${this.facility.energyUnit})` : `Annual Water Use (${this.facility.volumeLiquidUnit})`;
        return {
            type: 'chart',
            title,
            chartType: 'bar',
            labels,
            series,
            yAxisUnit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true
        };
    }

    private includeAnnualSource(sourceData: AnnualSourceData, sectionType: 'energyUse' | 'cost' | 'water'): boolean {
        if (sectionType === 'cost') {
            return true;
        } else if (sectionType === 'energyUse') {
            return EnergySources.includes(sourceData.source);
        } else {
            return WaterSources.includes(sourceData.source);
        }
    }

    private getAnnualSourceValue(item: AnnualSourceData['annualSourceDataItems'][number], sectionType: 'energyUse' | 'cost' | 'water'): number {
        if (sectionType === 'cost') {
            return item.totalCost ?? 0;
        } else if (sectionType === 'energyUse') {
            return item.totalEnergyUsage ?? 0;
        } else {
            return item.totalConsumption ?? 0;
        }
    }

    private buildMonthlyLineChart(sectionType: 'energyUse' | 'cost' | 'water', yearMonthData: Array<YearMonthData>): ChartSlide {
        let years: Array<number> = yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
        years = _.uniq(years);
        years = _.orderBy(years, (year) => { return year }, 'asc');

        let months: Array<Month> = Months.map(month => { return month });
        if (this.facility.fiscalYear == 'nonCalendarYear') {
            let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == this.facility.fiscalYearMonth });
            let fromStartMonth: Array<Month> = months.splice(monthStartIndex);
            months = fromStartMonth.concat(months);
        }

        const labels = months.map(month => month.abbreviation);
        const series: PptChartSeries[] = years.map((year, index) => {
            const y: Array<number> = months.map(month => {
                const row = yearMonthData.find(data => data.yearMonth.fiscalYear === year && data.yearMonth.monthNum === month.monthNumValue);
                if (!row) return 0;
                if (sectionType === 'energyUse') {
                    return row.energyUse ?? 0;
                }
                if (sectionType === 'water') {
                    return row.consumption ?? 0;
                }
                if (sectionType === 'cost') {
                    return row.energyCost ?? 0;
                }
            });
            const name: string = this.facility.fiscalYear === 'nonCalendarYear' ? `FY - ${year}` : year.toString();
            return {
                name,
                data: y,
                color: this.chartSeriesPalette[index % this.chartSeriesPalette.length]
            };
        });

        const allValues = series.flatMap(s => s.data).filter(v => isFinite(v) && !isNaN(v));
        const axis = getPptAxisSpec(allValues);
        const yAxisUnit = sectionType === 'water' ? this.facility.volumeLiquidUnit : sectionType === 'cost' ? 'Cost ($)' : this.facility.energyUnit;
        const title = sectionType === 'cost' ? 'Utility Costs' : sectionType === 'water' ? `Water Usage (${yAxisUnit})` : `Utility Usage (${yAxisUnit})`;
        return {
            type: 'chart',
            title,
            chartType: 'line',
            labels,
            series,
            yAxisUnit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true
        };
    }

    private formatValue(value: number, isCurrrency: boolean): string {
        if (value === null || isNaN(value) || value === 0 || value === undefined)
            return '—';
        return this.customNumberPipe.transform(value, isCurrrency);
    }
}