import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { inject, Injectable } from '@angular/core';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { PptDocument } from 'src/app/shared/ppt-report/models/ppt-document';
import { ChartSlide, getPptAxisSpec, ImageSlide, PptChartSeries, PptSlide, TableHeaderCell, TableSlide, TitleSlide } from 'src/app/shared/ppt-report/models/ppt-slide';
import { CustomNumberPipe } from 'src/app/shared/helper-pipes/custom-number.pipe';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';
import { DataOverviewAccount, DataOverviewFacility } from './data-overview-report.component';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { NaicsDisplayPipe } from 'src/app/shared/helper-pipes/naics-display.pipe';
import { MeterSource, EnergySources, WaterSources, AllSources } from 'src/app/models/constantsAndTypes';
import { UtilityColors } from 'src/app/shared/utilityColors';
import { UseAndCost, IUseAndCost } from 'src/app/calculations/dashboard-calculations/useAndCostClass';
import { AnnualSourceData, FacilityOverviewMeter } from 'src/app/calculations/dashboard-calculations/facilityOverviewClass';
import { YearMonthData } from 'src/app/models/dashboard';
import { Month, Months } from 'src/app/shared/form-data/months';
import { AccountOverviewData, AccountOverviewFacility } from 'src/app/calculations/dashboard-calculations/accountOverviewClass';

export interface DataOverviewReportPptInput {
    account: IdbAccount;
    report: IdbAccountReport;
    reportSettings: DataOverviewReportSetup;
    accountData: DataOverviewAccount;
    facilitiesData: Array<DataOverviewFacility>;
    usageDonutImages?: {
        energyUse?: string;
        water?: string;
        cost?: string;
    }
    mapImages?: {
        energyUse?: string;
        water?: string;
        cost?: string;
    }
}

@Injectable({ providedIn: 'root' })
export class DataOverviewReportPptAdapter {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
    customNumberPipe: CustomNumberPipe = inject(CustomNumberPipe);
    naicsDisplayPipe = inject(NaicsDisplayPipe);

    account: IdbAccount;
    report: IdbAccountReport;
    reportSettings: DataOverviewReportSetup;
    accountData: DataOverviewAccount;
    facilitiesData: Array<DataOverviewFacility>;
    usageDonutImages: {
        energyUse?: string;
        water?: string;
        cost?: string;
    };
    mapImages: {
        energyUse?: string;
        water?: string;
        cost?: string;
    };
    chartSeriesPalette: string[] = [
        '1F77B4', 'FF7F0E', '2CA02C', 'D62728', '9467BD', '8C564B',
        'E377C2', '7F7F7F', 'BCBD22', '17BECF', '4E79A7', 'F28E2B'
    ];

    buildDocument(data: DataOverviewReportPptInput): PptDocument {
        const slides: PptSlide[] = [];
        this.account = data.account;
        this.report = data.report;
        this.reportSettings = data.reportSettings;
        this.accountData = data.accountData;
        this.facilitiesData = data.facilitiesData;
        this.usageDonutImages = data.usageDonutImages ?? {};
        this.mapImages = data.mapImages ?? {};

        if (this.reportSettings.includeAccountReport) {
            if (this.reportSettings.includeEnergySection || this.reportSettings.includeWaterSection || this.reportSettings.includeCostsSection) {
                const titleSlide = this.buildTitleSlide(true);
                if (titleSlide) {
                    slides.push(titleSlide);
                }
            }
            if (this.reportSettings.includeEnergySection) {
                const energySlides: PptSlide[] = [];
                this.buildAccountReportSections(energySlides, 'energyUse');
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
                this.buildAccountReportSections(waterSlides, 'water');
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
                this.buildAccountReportSections(costSlides, 'cost');
                if (costSlides.length > 0) {
                    slides.push({
                        type: 'title',
                        title: 'Costs',
                        layout: 'section'
                    });
                    slides.push(...costSlides);
                }
            }
        }
        for (const facilityData of this.facilitiesData) {
            if (this.reportSettings.includeFacilityReports) {
                if (this.reportSettings.includeEnergySection || this.reportSettings.includeWaterSection || this.reportSettings.includeCostsSection) {
                    const titleSlide = this.buildTitleSlide(false, facilityData.facility);
                    if (titleSlide) {
                        slides.push(titleSlide);
                    }
                }

                if (this.reportSettings.includeEnergySection) {
                    const energySlides: PptSlide[] = [];
                    this.buildFacilityReportSections(facilityData, energySlides, 'energyUse');
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
                    this.buildFacilityReportSections(facilityData, waterSlides, 'water');
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
                    this.buildFacilityReportSections(facilityData, costSlides, 'cost');
                    if (costSlides.length > 0) {
                        slides.push({
                            type: 'title',
                            title: 'Costs',
                            layout: 'section'
                        });
                        slides.push(...costSlides);
                    }
                }
            }
        }
        return {
            metadata: { title: data.report.name },
            slides,
        };
    }

    private buildTitleSlide(isAccountReport: boolean, facility?: IdbFacility): TitleSlide {
        const startDate = new Date(this.report.startYear, this.report.startMonth, 1);
        const endDate = new Date(this.report.endYear, this.report.endMonth, 1);
        const currentDate = new Date().toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const titleFontSize = 14;
        let name: string;
        let address: string;
        let naics: string;
        let eGridSubregion: string;
        let notes: string;
        let reportName = isAccountReport ? this.report.name : '';
        if (isAccountReport) {
            name = this.account.name;
            address = this.account.address ? this.formatAddress(this.account.address, this.account.city, this.account.state, this.account.zip, this.account.country) : '';
            naics = this.naicsDisplayPipe.transform(this.account) ? `NAICS: ${this.naicsDisplayPipe.transform(this.account)}` : '';
            eGridSubregion = this.account.eGridSubregion ? `eGrid Subregion: ${this.account.eGridSubregion}` : '';
            notes = this.account.notes ? `Notes: ${this.account.notes}` : '';
        }
        else {
            name = facility.name ?? '';
            address = facility.address ? this.formatAddress(facility.address, facility.city, facility.state, facility.zip, facility.country) : '';
            naics = this.naicsDisplayPipe.transform(facility) ? `NAICS: ${this.naicsDisplayPipe.transform(facility)}` : '';
            eGridSubregion = facility.eGridSubregion ? `eGrid Subregion: ${facility.eGridSubregion}` : '';
            notes = facility.notes ? `Notes: ${facility.notes}` : '';
        }
        return {
            type: 'title',
            title: `${name}\n ${address}\n ${naics}\n ${eGridSubregion}\n ${notes}`,
            subtitle: `${reportName}\n(${startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })})\nGenerated on: ${currentDate}`,
            layout: 'section',
            titleFontSize: titleFontSize,
        };
    }

    private buildAccountReportSections(slides: PptSlide[], sectionType: 'energyUse' | 'cost' | 'water') {
        if (this.reportSettings.includeMap) {
            const imageSlide: ImageSlide = this.buildMapImageSlide(sectionType);
            if (imageSlide) {
                slides.push(imageSlide);
            }
        }
        if (this.reportSettings.includeFacilityTable) {
            const tableSlide: TableSlide = this.buildFacilityUsageTable(sectionType);
            if (tableSlide) {
                slides.push(tableSlide);
            }
        }
        if (this.reportSettings.includeFacilityDonut) {
            const imageSlide: ImageSlide = this.buildFacilityUsageImageSlide(sectionType);
            if (imageSlide) {
                slides.push(imageSlide);
            }
        }
        if (this.reportSettings.includeFacilityTable) {
            const tableSlide: TableSlide = this.buildUtilityUsageTable(sectionType);
            if (tableSlide) {
                slides.push(tableSlide);
            }
        }
        if (this.reportSettings.includeFacilityDonut) {
            const chartSlide: ChartSlide = this.buildUtilityUsageChart(sectionType);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        if (this.reportSettings.includeUtilityTable) {
            if (sectionType === 'energyUse' || sectionType === 'water') {
                const tableSlide: TableSlide = this.buildUtilityComparisonTable(sectionType);
                if (tableSlide) {
                    slides.push(tableSlide);
                }
            }
            if (sectionType === 'cost') {
                const tableSlide: TableSlide = this.buildUtilityComparisonCostTable();
                if (tableSlide) {
                    slides.push(tableSlide);
                }
            }
        }
        if (this.reportSettings.includeStackedBarChart) {
            const chartSlide: ChartSlide = this.buildUtilityComparisonChart(sectionType);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        const yearMonthData = sectionType === 'energyUse' ? this.accountData.accountOverviewData.energyYearMonthData : sectionType === 'water' ? this.accountData.accountOverviewData.waterYearMonthData : this.accountData.accountOverviewData.allSourcesYearMonthData;
        if (this.reportSettings.includeMonthlyLineChart) {
            const chartSlide: ChartSlide = this.buildMonthlyLineChart(sectionType, yearMonthData, this.account);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
    }

    private buildFacilityReportSections(facilityData: DataOverviewFacility, slides: PptSlide[], sectionType: 'energyUse' | 'cost' | 'water') {
        const facilityOverviewMeters = sectionType === 'energyUse' ? facilityData.facilityOverviewData.energyMeters : sectionType === 'water' ? facilityData.facilityOverviewData.waterMeters : facilityData.facilityOverviewData.costMeters;
        if (this.reportSettings.includeMeterUsageStackedLineChart && facilityData.facilityOverviewData.calanderizedMeters?.length > 0) {
            const chartSlide: ChartSlide = this.buildStackedLineChart(facilityData, sectionType);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        if (this.reportSettings.includeMeterUsageTable && facilityData.facilityOverviewData.calanderizedMeters?.length > 0 && facilityOverviewMeters?.length > 0) {
            const tableSlide: TableSlide = this.buildMeterUsageTable(sectionType, facilityOverviewMeters, facilityData);
            if (tableSlide) {
                slides.push(tableSlide);
            }
        }
        if (this.reportSettings.includeMeterUsageDonut && facilityOverviewMeters?.length > 0) {
            const chartSlide: ChartSlide = this.buildMeterUsageDonutChart(sectionType, facilityOverviewMeters, facilityData);
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        let sourcesUseAndCost: Array<UseAndCost> = [];
        let useAndCostTotal: { end: IUseAndCost; average: IUseAndCost; previousYear: IUseAndCost; } = null;
        if (sectionType === 'energyUse') {
            sourcesUseAndCost = facilityData.utilityUseAndCost.energyUseAndCost;
            useAndCostTotal = facilityData.utilityUseAndCost.energyTotal;
        }
        if (sectionType === 'water') {
            sourcesUseAndCost = facilityData.utilityUseAndCost.waterUseAndCost;
            useAndCostTotal = facilityData.utilityUseAndCost.waterTotal;
        }
        if (sectionType === 'cost') {
            sourcesUseAndCost = facilityData.utilityUseAndCost.allSourcesUseAndCost;
            useAndCostTotal = facilityData.utilityUseAndCost.allSourcesTotal;
        }
        if (this.reportSettings.includeUtilityTableForFacility && sourcesUseAndCost?.length > 0 && useAndCostTotal) {
            if (sectionType === 'energyUse' || sectionType === 'water') {
                const tableSlide: TableSlide = this.buildUtilityConsumptionTable(sectionType, sourcesUseAndCost, useAndCostTotal, facilityData.utilityUseAndCost.previousYear, facilityData);
                if (tableSlide) {
                    slides.push(tableSlide);
                }
            }
            if (sectionType === 'cost') {
                const tableSlide: TableSlide = this.buildUtilityConsumptionCostTable(sourcesUseAndCost, useAndCostTotal, facilityData.utilityUseAndCost.previousYear, facilityData);
                if (tableSlide) {
                    slides.push(tableSlide);
                }
            }
        }
        if (this.reportSettings.includeAnnualBarChart && facilityData.facilityOverviewData.annualSourceData?.length > 0) {
            const annualBarChartSlide: ChartSlide = this.buildAnnualBarChart(sectionType, facilityData.facilityOverviewData.annualSourceData, facilityData);
            if (annualBarChartSlide) {
                slides.push(annualBarChartSlide);
            }
        }
        const yearMonthData = sectionType === 'energyUse' ? facilityData.facilityOverviewData.energyYearMonthData : sectionType === 'water' ? facilityData.facilityOverviewData.waterYearMonthData : facilityData.facilityOverviewData.allSourcesYearMonthData;
        if (this.reportSettings.includeMonthlyLineChartForFacility && yearMonthData?.length > 0) {
            const monthlyLineChartSlide: ChartSlide = this.buildMonthlyLineChart(sectionType, yearMonthData, facilityData.facility);
            if (monthlyLineChartSlide) {
                slides.push(monthlyLineChartSlide);
            }
        }
    }

    private buildMapImageSlide(sectionType: 'energyUse' | 'cost' | 'water'): ImageSlide {
        const imageUrl = sectionType === 'energyUse' ? this.mapImages?.energyUse : sectionType === 'water' ? this.mapImages?.water : this.mapImages?.cost;
        if (!imageUrl) {
            return null;
        }
        return {
            type: 'image',
            title: 'Map Overview',
            imageData: imageUrl
        };
    }

    private buildFacilityUsageTable(sectionType: 'energyUse' | 'cost' | 'water'): TableSlide {
        const accountOverviewFacilities: Array<AccountOverviewFacility> = sectionType === 'energyUse' ? this.accountData.accountOverviewData.facilitiesEnergy : sectionType === 'water' ? this.accountData.accountOverviewData.facilitiesWater : this.accountData.accountOverviewData.facilitiesCost;
        const accountOverviewData: AccountOverviewData = this.accountData.accountOverviewData;
        const unit = sectionType === 'energyUse' ? this.account.energyUnit : sectionType === 'water' ? this.account.volumeLiquidUnit : '';
        const title = sectionType === 'cost' ? 'Cost Breakdown by Facility' : 'Consumption Breakdown by Facility';
        let headers: string[] = [];
        if (sectionType === 'energyUse') {
            headers = ['Facility', `Utility Usage (${unit})`, 'Utility Cost'];
        }
        if (sectionType === 'water') {
            headers = ['Facility', `Water Consumption (${unit})`, 'Utility Cost'];
        }
        if (sectionType === 'cost') {
            headers = ['Facility', '# of Meters', 'Utility Cost'];
        }
        let rows: string[][] = [];
        accountOverviewFacilities.forEach(summary => {
            let row: string[] = [];
            row.push(summary.facility.name);
            if (sectionType === 'energyUse' || sectionType === 'water') {
                row.push(this.formatValue(summary.totalUsage, false));
            }
            if (sectionType === 'cost') {
                row.push(summary.numberOfMeters.toString());
            }
            row.push(this.formatValue(summary.totalCost, true));
            rows.push(row);
        });
        let totalRow: string[] = ['Total'];
        if (sectionType === 'energyUse') {
            totalRow.push(this.formatValue(accountOverviewData.totalEnergyUsage, false));
            totalRow.push(this.formatValue(accountOverviewData.totalEnergyCost, true));
        }
        if (sectionType === 'water') {
            totalRow.push(this.formatValue(accountOverviewData.totalWaterConsumption, false));
            totalRow.push(this.formatValue(accountOverviewData.totalWaterCost, true));
        }
        if (sectionType === 'cost') {
            totalRow.push(accountOverviewData.numberOfMeters.toString());
            totalRow.push(this.formatValue(accountOverviewData.totalAccountCost, true));
        }
        rows.push(totalRow);
        return {
            type: 'table',
            title: title,
            headers,
            rows: rows,
        };
    }

    private buildFacilityUsageImageSlide(sectionType: 'energyUse' | 'cost' | 'water'): ImageSlide {
        const imageUrl = sectionType === 'energyUse' ? this.usageDonutImages?.energyUse : sectionType === 'water' ? this.usageDonutImages?.water : this.usageDonutImages?.cost;
        if (!imageUrl) {
            return null;
        }
        const title = sectionType === 'cost' ? 'Cost Breakdown by Facility' : 'Consumption Breakdown by Facility';
        return {
            type: 'image',
            title: title,
            imageData: imageUrl
        };
    }

    private buildUtilityUsageTable(sectionType: 'energyUse' | 'cost' | 'water'): TableSlide {
        const accountOverviewData: AccountOverviewData = this.accountData.accountOverviewData;
        const unit = sectionType === 'energyUse' ? this.account.energyUnit : sectionType === 'water' ? this.account.volumeLiquidUnit : '';
        const title = sectionType === 'cost' ? 'Cost Breakdown by Utility' : 'Consumption Breakdown by Utility';
        let headers: string[] = [];
        let rows: string[][] = [];
        let totalUsage: number;
        let totalCost: number;
        const sourceTotals = this.accountData.accountOverviewData.sourceTotals;
        const allSources = [
            sourceTotals.electricity,
            sourceTotals.naturalGas,
            sourceTotals.otherFuels,
            sourceTotals.otherEnergy,
            sourceTotals.waterIntake,
            sourceTotals.waterDischarge,
            sourceTotals.other
        ];
        if (sectionType === 'energyUse') {
            headers = ['Utility', `Utility Usage (${unit})`, 'Utility Cost'];
            totalUsage = accountOverviewData.totalEnergyUsage;
            totalCost = accountOverviewData.totalEnergyCost;
            allSources.forEach(sourceTotal => {
                if (sourceTotal.energyUse) {
                    rows.push([
                        sourceTotal.sourceLabel,
                        this.formatValue(sourceTotal.energyUse, false),
                        this.formatValue(sourceTotal.cost, true)
                    ]);
                }
            });
        }
        if (sectionType === 'water') {
            headers = ['Utility', `Water Consumption (${unit})`, 'Water Cost'];
            totalUsage = accountOverviewData.totalWaterConsumption;
            totalCost = accountOverviewData.totalWaterCost;
            accountOverviewData.waterTypeData.forEach(waterTotal => {
                rows.push([
                    waterTotal.waterType,
                    this.formatValue(waterTotal.totalConsumption, false),
                    this.formatValue(waterTotal.totalCost, true)
                ]);
            });
        }
        if (sectionType === 'cost') {
            headers = ['Utility', '# of Meters', 'Utility Cost'];
            totalUsage = accountOverviewData.numberOfMeters;
            totalCost = accountOverviewData.totalEnergyCost;
            allSources.forEach(sourceTotal => {
                if (sourceTotal.cost) {
                    rows.push([
                        sourceTotal.sourceLabel,
                        sourceTotal.numberOfMeters.toString(),
                        this.formatValue(sourceTotal.cost, true)
                    ]);
                }
            });
        }
        let totalRow: string[] = ['Total', this.formatValue(totalUsage, false), this.formatValue(totalCost, true)];
        rows.push(totalRow);

        return {
            type: 'table',
            title,
            headers,
            rows
        };
    }

    private buildUtilityUsageChart(sectionType: 'energyUse' | 'cost' | 'water'): ChartSlide {
        const sourceTotals = this.accountData.accountOverviewData.sourceTotals;
        const allSources = [
            sourceTotals.electricity,
            sourceTotals.naturalGas,
            sourceTotals.otherFuels,
            sourceTotals.otherEnergy,
            sourceTotals.waterIntake,
            sourceTotals.waterDischarge,
            sourceTotals.other
        ];

        let labels: string[] = [];
        let values: number[] = [];
        let barColors: string[] = [];
        let title = '';
        let yAxisUnit = '';
        let seriesName = '';

        if (sectionType === 'energyUse') {
            const ordered = allSources
                .filter(s => (s?.energyUse ?? 0) > 0)
                .reverse();

            values = ordered.map(s => s.energyUse ?? 0);
            const total = values.reduce((sum, v) => sum + v, 0);
            labels = ordered.map((s, i) => {
                const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
                return s.sourceLabel + ' (' + pct + '%)';
            });
            barColors = ordered.map((s, i) =>
                UtilityColors[s.sourceLabel]?.color?.replace('#', '') ?? this.chartSeriesPalette[i % this.chartSeriesPalette.length]
            );

            title = 'Utility Usage Breakdown';
            yAxisUnit = this.account.energyUnit;
            seriesName = 'Utility Usage (' + yAxisUnit + ')';
        } else if (sectionType === 'cost') {
            const ordered = allSources
                .filter(s => (s?.cost ?? 0) > 0)
                .reverse();

            values = ordered.map(s => s.cost ?? 0);
            const total = values.reduce((sum, v) => sum + v, 0);
            labels = ordered.map((s, i) => {
                const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
                return s.sourceLabel + ' (' + pct + '%)';
            });
            barColors = ordered.map((s, i) =>
                UtilityColors[s.sourceLabel]?.color?.replace('#', '') ?? this.chartSeriesPalette[i % this.chartSeriesPalette.length]
            );

            title = 'Utility Cost Breakdown';
            yAxisUnit = '$';
            seriesName = 'Utility Cost';
        } else {
            const ordered = [...this.accountData.accountOverviewData.waterTypeData]
                .filter(w => (w?.totalConsumption ?? 0) > 0)
                .reverse();

            values = ordered.map(w => w.totalConsumption ?? 0);
            const total = values.reduce((sum, v) => sum + v, 0);
            labels = ordered.map((w, i) => {
                const pct = total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0';
                return w.waterType + ' (' + pct + '%)';
            });
            barColors = ordered.map((w, i) =>
                (w.color ?? '').replace('#', '') || this.chartSeriesPalette[i % this.chartSeriesPalette.length]
            );

            title = 'Water Consumption Breakdown';
            yAxisUnit = this.account.volumeLiquidUnit;
            seriesName = 'Water Consumption (' + yAxisUnit + ')';
        }

        if (!values.length || values.every(v => v === 0)) {
            return null;
        }

        const axis = getPptAxisSpec(values.filter(v => Number.isFinite(v)));

        return {
            type: 'chart',
            title,
            chartType: 'bar',
            barDir: 'bar',
            labels,
            barColors,
            series: [{
                name: seriesName,
                data: values
            }],
            yAxisUnit,
            valAxisMinVal: 0,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: false,
            showDataLabels: true
        };
    }

    private buildUtilityComparisonChart(sectionType: 'energyUse' | 'cost' | 'water'): ChartSlide {
        const overview = this.accountData.accountOverviewData;
        const dateRange = this.accountData.dateRange;

        if (!overview || !dateRange?.startDate || !dateRange?.endDate) {
            return null;
        }

        if (sectionType === 'water') {
            const facilities = [...(overview.facilitiesWater ?? [])]
                .sort((a, b) => (b.totalUsage ?? 0) - (a.totalUsage ?? 0));

            if (!facilities.length) {
                return null;
            }

            const labels = facilities.map(f => f.facility?.name ?? '');
            const waterTypes = overview.waterTypeData ?? [];

            const series: PptChartSeries[] = [];
            waterTypes.forEach((wt, idx) => {
                const y = facilities.map(fac => {
                    const hit = (fac.waterTypeData ?? []).find(x => x.waterType === wt.waterType);
                    return hit?.totalConsumption ?? 0;
                });
                const hasAny = y.some(v => Number.isFinite(v) && v !== 0);
                if (hasAny) {
                    series.push({
                        name: wt.waterType,
                        data: y,
                        color: (wt.color ?? '').replace('#', '') || this.chartSeriesPalette[idx % this.chartSeriesPalette.length]
                    });
                }
            });

            if (!series.length) {
                return null;
            }

            const stackedTotals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
            const axis = getPptAxisSpec(stackedTotals.filter(v => Number.isFinite(v)));

            return {
                type: 'chart',
                title: 'Water Usage by Facility',
                chartType: 'bar',
                barGrouping: 'stacked',
                labels,
                series,
                yAxisUnit: 'Water Usage (' + this.account.volumeLiquidUnit + ')',
                valAxisMinVal: 0,
                valAxisMaxVal: axis.max,
                valAxisMajorUnit: axis.majorUnit,
                valAxisLabelFormatCode: axis.labelFormat,
                showLegend: true
            };
        }

        const sourceOrder: string[] = sectionType === 'energyUse'
            ? ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy']
            : ['Electricity', 'Natural Gas', 'Other Fuels', 'Other Energy', 'Water Intake', 'Water Discharge', 'Other'];

        const facilityList = (sectionType === 'energyUse' ? overview.facilitiesEnergy : overview.facilitiesCost) ?? [];
        if (!facilityList.length) {
            return null;
        }

        const byFacility = new Map<string, { name: string; values: Record<string, number> }>();
        facilityList.forEach(f => {
            const fid = f.facility?.guid;
            if (!fid) return;
            byFacility.set(fid, {
                name: f.facility?.name ?? '',
                values: sourceOrder.reduce((acc, s) => {
                    acc[s] = 0;
                    return acc;
                }, {} as Record<string, number>)
            });
        });

        (overview.calanderizedMeters ?? []).forEach(cMeter => {
            const fid = cMeter.meter?.facilityId;
            const source = cMeter.meter?.source;
            if (!fid || !source || !byFacility.has(fid) || !sourceOrder.includes(source)) {
                return;
            }

            const bucket = byFacility.get(fid);
            cMeter.monthlyData?.forEach(md => {
                const d = new Date(md.date);
                if (d >= dateRange.startDate && d <= dateRange.endDate) {
                    const addVal = sectionType === 'energyUse'
                        ? Number(md.energyUse ?? 0)
                        : Number(md.energyCost ?? 0);
                    bucket.values[source] = (bucket.values[source] ?? 0) + (Number.isFinite(addVal) ? addVal : 0);
                }
            });
        });

        const facilities = Array.from(byFacility.values())
            .map(f => ({
                ...f,
                total: sourceOrder.reduce((sum, s) => sum + (f.values[s] ?? 0), 0)
            }))
            .sort((a, b) => b.total - a.total);

        const labels = facilities.map(f => f.name);
        if (!labels.length) {
            return null;
        }

        const series: PptChartSeries[] = [];
        sourceOrder.forEach((source, idx) => {
            const y = facilities.map(f => f.values[source] ?? 0);
            const hasAny = y.some(v => Number.isFinite(v) && v !== 0);
            if (hasAny) {
                series.push({
                    name: source === 'Water Intake' ? 'Water' : (source === 'Water Discharge' ? 'Waste Water' : source),
                    data: y,
                    color: UtilityColors[source]?.color?.replace('#', '') ?? this.chartSeriesPalette[idx % this.chartSeriesPalette.length]
                });
            }
        });

        if (!series.length) {
            return null;
        }

        const stackedTotals = labels.map((_, i) => series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
        const axis = getPptAxisSpec(stackedTotals.filter(v => Number.isFinite(v)));

        return {
            type: 'chart',
            title: sectionType === 'energyUse' ? 'Utility Usage by Facility' : 'Utility Cost by Facility',
            chartType: 'bar',
            barGrouping: 'stacked',
            labels,
            series,
            yAxisUnit: sectionType === 'energyUse' ? 'Utility Usage (' + this.account.energyUnit + ')' : 'Utility Costs',
            valAxisMinVal: 0,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: sectionType === 'cost' ? '$#,##0' : axis.labelFormat,
            showLegend: true
        };
    }

    private buildUtilityComparisonTable(sectionType: 'energyUse' | 'water'): TableSlide {
        let headers: Array<string | TableHeaderCell> = [];
        let subHeaders: string[] = [];
        let rows: string[][] = [];
        const sourcesUseAndCost = sectionType === 'energyUse' ? this.accountData.utilityUseAndCost.energyUseAndCost : this.accountData.utilityUseAndCost.waterUseAndCost;
        const useAndCostTotal = sectionType === 'energyUse' ? this.accountData.utilityUseAndCost.energyTotal : this.accountData.utilityUseAndCost.waterTotal;
        const unit = sectionType === 'energyUse' ? this.account.energyUnit : sectionType === 'water' ? this.account.volumeLiquidUnit : '';
        const endDate = this.accountData.dateRange.endDate ? this.accountData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = this.accountData.utilityUseAndCost.previousYear ? this.accountData.utilityUseAndCost.previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = this.accountData.dateRange.startDate && this.accountData.dateRange.endDate ? `${this.accountData.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${this.accountData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';
        headers = [
            { content: '', colspan: 1 },
            { content: `Latest Month\n(${endDate})`, colspan: 2 },
            { content: `Previous Year\n(${previousYearDate})`, colspan: 2 },
            { content: `Monthly Average\n(${averageDate})`, colspan: 2 }
        ];
        subHeaders = ['Utility', `Utility Use\n(${unit})`, 'Utility Cost', `Utility Use\n(${unit})`, 'Utility Cost', `Utility Use\n(${unit})`, 'Utility Cost'];

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
        let totalRow: string[] = [
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
            title: 'Utility Comparison',
            headers,
            subHeaders,
            rows
        };
    }

    private buildUtilityComparisonCostTable(): TableSlide {
        let rows: string[][] = [];
        const sourcesUseAndCost = this.accountData.utilityUseAndCost.allSourcesUseAndCost;
        const useAndCostTotal = this.accountData.utilityUseAndCost.allSourcesTotal;
        const endDate = this.accountData.dateRange.endDate ? this.accountData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = this.accountData.utilityUseAndCost.previousYear ? this.accountData.utilityUseAndCost.previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = this.accountData.dateRange.startDate && this.accountData.dateRange.endDate ? `${this.accountData.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${this.accountData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';

        const headers = ['Utility', `Latest Month\n(${endDate})`, `Previous Year\n(${previousYearDate})`, `Monthly Average\n(${averageDate})`];

        sourcesUseAndCost.forEach(s => {
            let row: string[] = [];
            row.push(s.source);
            row.push(this.formatValue(s.end?.cost, true));
            row.push(this.formatValue(s.previousYear?.cost, true));
            row.push(this.formatValue(s.average?.cost, true));
            rows.push(row);
        });
        let totalRow: string[] = [
            'Total',
            this.formatValue(useAndCostTotal.end?.cost, true),
            this.formatValue(useAndCostTotal.previousYear?.cost, true),
            this.formatValue(useAndCostTotal.average?.cost, true)
        ];
        rows.push(totalRow);

        return {
            type: 'table',
            title: 'Utility Comparison',
            headers,
            rows
        };
    }

    private buildStackedLineChart(facilityData: DataOverviewFacility, sectionType: 'energyUse' | 'cost' | 'water'): ChartSlide {
        const includedSources: Array<MeterSource> = sectionType === 'energyUse' ? EnergySources : sectionType === 'water' ? WaterSources : AllSources;

        const filteredMeters = _.orderBy(
            facilityData.facilityOverviewData.calanderizedMeters.filter(cMeter => {
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
                if (date >= facilityData.dateRange.startDate && date <= facilityData.dateRange.endDate) {
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
                if (date >= facilityData.dateRange.startDate && date <= facilityData.dateRange.endDate) {
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

        const stackedTotals = sortedKeys.map((k, i) => series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0));
        const axis = getPptAxisSpec(stackedTotals.filter(v => isFinite(v) && !isNaN(v)));
        const yAxisUnit = sectionType === 'water' ? facilityData.facility.volumeLiquidUnit : sectionType === 'cost' ? 'Cost ($)' : facilityData.facility.energyUnit;

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

    private buildMeterUsageTable(sectionType: 'energyUse' | 'cost' | 'water', facilityOverviewMeters: Array<FacilityOverviewMeter>, facilityData: DataOverviewFacility): TableSlide {
        const title = 'Utility Usage Breakdown';
        let headers = ['Meter', 'Utility', 'Group'];
        if (sectionType === 'energyUse') {
            headers.push(`Utility Usage (${facilityData.facility.energyUnit})`);
        }
        if (sectionType === 'water') {
            headers.push(`Consumption (${facilityData.facility.volumeLiquidUnit})`);
        }
        headers.push('Utility Cost');

        let rows: string[][] = [];
        facilityOverviewMeters.forEach(m => {
            let row: string[] = [];
            row.push(m.meter.name);
            row.push(m.meter.source);
            row.push(this.accountWorkspaceQuery.getMeterGroupName(m.meter.groupId));
            if (sectionType === 'energyUse' || sectionType === 'water') {
                row.push(this.formatValue(m.totalUsage, false));
            }
            row.push(this.formatValue(m.totalCost, true));
            rows.push(row);
        });

        let totalRow: string[] = ['Total', '', ''];
        if (sectionType === 'energyUse') {
            totalRow.push(this.formatValue(facilityData.facilityOverviewData.totalEnergyUsage, false));
            totalRow.push(this.formatValue(facilityData.facilityOverviewData.totalEnergyCost, true));
        }
        if (sectionType === 'water') {
            totalRow.push(this.formatValue(facilityData.facilityOverviewData.totalWaterConsumption, false));
            totalRow.push(this.formatValue(facilityData.facilityOverviewData.totalWaterCost, true));
        }
        if (sectionType === 'cost') {
            totalRow.push(this.formatValue(facilityData.facilityOverviewData.totalFacilityCost, true));
        }
        rows.push(totalRow);
        return {
            type: 'table',
            title,
            headers,
            rows,
        };
    }

    private buildMeterUsageDonutChart(sectionType: 'energyUse' | 'cost' | 'water', facilityOverviewMeters: Array<FacilityOverviewMeter>, facilityData: DataOverviewFacility): ChartSlide {
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
            : sectionType === 'water' ? facilityData.facility.volumeLiquidUnit
                : facilityData.facility.energyUnit;

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
        previousYear: Date,
        facilityData: DataOverviewFacility): TableSlide {
        const title = 'Utility Usage Comparison';
        const endDate = facilityData.dateRange.endDate ? facilityData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = previousYear ? previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = facilityData.dateRange.startDate && facilityData.dateRange.endDate ? `${facilityData.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${facilityData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';
        const unit = sectionType === 'energyUse' ? facilityData.facility.energyUnit : sectionType === 'water' ? facilityData.facility.volumeLiquidUnit : '';
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
        previousYear: Date, facilityData: DataOverviewFacility): TableSlide {
        const title = 'Cost Comparison';
        const endDate = facilityData.dateRange.endDate ? facilityData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = previousYear ? previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = facilityData.dateRange.startDate && facilityData.dateRange.endDate ? `${facilityData.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${facilityData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';
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

    private buildAnnualBarChart(sectionType: 'energyUse' | 'cost' | 'water', annualSourceData: Array<AnnualSourceData>, facilityData: DataOverviewFacility): ChartSlide {
        const filteredSources = annualSourceData.filter(sourceData => {
            return this.includeAnnualSource(sourceData, sectionType);
        });
        if (!filteredSources.length) return null;

        const years: Array<number> = _.chain(filteredSources).flatMap(sourceData => sourceData.annualSourceDataItems.map(d => d.fiscalYear)).uniq().sortBy().value();
        if (!years.length) return null;

        const labels: Array<string> = years.map(year => facilityData.facility.fiscalYear === 'nonCalendarYear' ? `FY - ${year}` : year.toString());

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
        const yAxisUnit = sectionType === 'water' ? `Utility Usage (${facilityData.facility.volumeLiquidUnit})` : sectionType === 'cost' ? 'Utility Costs' : `Utility Usage (${facilityData.facility.energyUnit})`;
        const title = sectionType === 'cost' ? 'Annual Cost' : sectionType === 'energyUse' ? `Annual Energy Use (${facilityData.facility.energyUnit})` : `Annual Water Use (${facilityData.facility.volumeLiquidUnit})`;
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

    private buildMonthlyLineChart(sectionType: 'energyUse' | 'cost' | 'water', yearMonthData: Array<YearMonthData>, accountOrFacility: IdbAccount | IdbFacility): ChartSlide {
        let years: Array<number> = yearMonthData.flatMap(data => { return data.yearMonth.fiscalYear });
        years = _.uniq(years);
        years = _.orderBy(years, (year) => { return year }, 'asc');

        let months: Array<Month> = Months.map(month => { return month });
        if (accountOrFacility.fiscalYear == 'nonCalendarYear') {
            let monthStartIndex: number = months.findIndex(month => { return month.monthNumValue == accountOrFacility.fiscalYearMonth });
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
            const name: string = accountOrFacility.fiscalYear === 'nonCalendarYear' ? `FY - ${year}` : year.toString();
            return {
                name,
                data: y,
                color: this.chartSeriesPalette[index % this.chartSeriesPalette.length]
            };
        });

        const allValues = series.flatMap(s => s.data).filter(v => isFinite(v) && !isNaN(v));
        const axis = getPptAxisSpec(allValues);
        const yAxisUnit = sectionType === 'water' ? accountOrFacility.volumeLiquidUnit : sectionType === 'cost' ? 'Cost ($)' : accountOrFacility.energyUnit;
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

    private formatValue(value: number, isCurrency: boolean): string {
        if (value === null || isNaN(value) || value === 0 || value === undefined)
            return '—';
        return this.customNumberPipe.transform(value, isCurrency);
    }

    private formatAddress(address?: string, city?: string, state?: string, zip?: string, country?: string): string {
        return [address, city, [state, zip].filter(Boolean).join(' '), country]
            .filter(Boolean)
            .join(', ');
    }
}