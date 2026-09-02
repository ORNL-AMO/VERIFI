import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { inject, Injectable } from '@angular/core';
import * as _ from 'lodash';
import { IdbFacility } from '@data/models/idbModels/facility';
import { PptDocument } from '@v0/shared/ppt-report/models/ppt-document';
import { PptSlide, TableSlide, ChartSlide, TableHeaderCell, getPptAxisSpec, PptChartSeries } from '@v0/shared/ppt-report/models/ppt-slide';
import { CustomNumberPipe } from '@v0/shared/helper-pipes/custom-number.pipe';
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from '@data/models/idbModels/facilityReport';
import { IUseAndCost, UseAndCost, UtilityUseAndCost } from '@domain/calculations/dashboard-calculations/useAndCostClass';
import { AnnualSourceData, FacilityOverviewData, FacilityOverviewMeter } from '@domain/calculations/dashboard-calculations/facilityOverviewClass';
import { UtilityColors } from '@shared/utilityColors';
import { AllSources, EnergySources, MeterSource, WaterSources } from '@data/models/constantsAndTypes';
import { YearMonthData } from '@data/models/dashboard';
import { Month, Months } from '@shared/form-data/months';
import { IdbAccount } from '@app/data/models/idbModels/account';
import { AccountWorkspaceStore } from '@app/data/account-workspace/account-workspace.store';
import { EmissionsTypes, getEmissionsTypeColor, getEmissionsTypes } from '@app/data/models/eGridEmissions';
import { MonthlyData } from '@app/data/models/calanderization';

export interface FacilityOverviewReportPptInput {
    facility: IdbFacility;
    report: IdbFacilityReport;
    facilityOverviewData: FacilityOverviewData;
    utilityUseAndCost: UtilityUseAndCost;
    dateRange: {
        startDate: Date,
        endDate: Date
    };
    emissionsDisplay: "location" | "market";
}

@Injectable({ providedIn: 'root' })
export class FacilityOverviewReportPptAdapter {
    private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
    private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
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

    account: IdbAccount;
    emissionsDisplay: "location" | "market";

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
        this.account = this.accountWorkspaceStore.account();
        this.emissionsDisplay = data.emissionsDisplay;

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
        if (this.account.displayEmissions && this.reportSettings.includeEmissionsSection) {
            const emissionsSlides: PptSlide[] = [];
            this.buildEmissionsSections(emissionsSlides);
            if (emissionsSlides.length > 0) {
                slides.push({
                    type: 'title',
                    title: 'Emissions',
                    layout: 'section'
                });
                slides.push(...emissionsSlides);
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

    private buildEmissionsSections(slides: PptSlide[]) {
        const facilityOverviewMeters = this.facilityOverviewData.costMeters;
        if (this.reportSettings.includeMeterUsageStackedLineChart && this.facilityOverviewData.calanderizedMeters?.length > 0) {
            const chartSlide: ChartSlide = this.buildEmissionsStackedLineChart();
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        if (this.reportSettings.includeMeterUsageTable && this.facilityOverviewData.calanderizedMeters?.length > 0 && facilityOverviewMeters?.length > 0) {
            const tableSlide: TableSlide = this.buildEmissionsUsageTable();
            if (tableSlide) {
                slides.push(tableSlide);
            }
        }
        if (this.reportSettings.includeMeterUsageDonut && facilityOverviewMeters?.length > 0) {
            const chartSlide: ChartSlide = this.buildEmissionsUsageChart();
            if (chartSlide) {
                slides.push(chartSlide);
            }
        }
        let sourcesUseAndCost: Array<UseAndCost> = this.utilityUseAndCost.allSourcesUseAndCost;
        let useAndCostTotal: { end: IUseAndCost; average: IUseAndCost; previousYear: IUseAndCost; } = this.utilityUseAndCost.allSourcesTotal;
        if (this.reportSettings.includeUtilityTableForFacility && sourcesUseAndCost?.length > 0 && useAndCostTotal) {
            const tableSlide: TableSlide = this.buildEmissionsConsumptionTable(useAndCostTotal, this.utilityUseAndCost.previousYear);
            if (tableSlide) {
                slides.push(tableSlide);
            }
        }
        if (this.reportSettings.includeAnnualBarChart && this.facilityOverviewData.annualSourceData?.length > 0) {
            const annualBarChartSlide: ChartSlide = this.buildAnnualEmissionsBarChart(this.facilityOverviewData.annualSourceData);
            if (annualBarChartSlide) {
                slides.push(annualBarChartSlide);
            }
        }
        const yearMonthData = this.facilityOverviewData.allSourcesYearMonthData;
        if (this.reportSettings.includeMonthlyLineChartForFacility && yearMonthData?.length > 0) {
            const monthlyLineChartSlide: ChartSlide = this.buildMonthlyLineChart('emissions', yearMonthData);
            if (monthlyLineChartSlide) {
                slides.push(monthlyLineChartSlide);
            }
        }
    }

    private buildEmissionsStackedLineChart(): ChartSlide {
        const monthlyData = this.facilityOverviewData.calanderizedMeters
            .flatMap(cm => cm.monthlyData)
            .filter(item => {
                const date = new Date(item.date);
                return date >= this.dateRange.startDate && date <= this.dateRange.endDate;
            });

        const months: Date[] = [];
        for (let date = new Date(this.dateRange.startDate); date <= this.dateRange.endDate; date.setMonth(date.getMonth() + 1)) {
            months.push(new Date(date));
        }

        const getValue = (type: EmissionsTypes, data: MonthlyData): number => {
            switch (type) {
                case 'Scope 1: Fugitive': return data.fugitiveEmissions ?? 0;
                case 'Scope 2: Electricity (Location)': return data.locationElectricityEmissions ?? 0;
                case 'Scope 2: Electricity (Market)': return data.marketElectricityEmissions ?? 0;
                case 'Scope 1: Mobile': return data.mobileTotalEmissions ?? 0;
                case 'Scope 1: Process': return data.processEmissions ?? 0;
                case 'Scope 1: Stationary': return data.stationaryEmissions ?? 0;
                case 'Scope 2: Other': return data.otherScope2Emissions ?? 0;
            }
        };

        const series: PptChartSeries[] = getEmissionsTypes(this.emissionsDisplay)
            .map(type => ({
                name: type,
                type: 'area' as const,
                data: months.map(month => _.sumBy(
                    monthlyData.filter(item =>
                        item.monthNumValue === month.getMonth() && item.year === month.getFullYear()
                    ),
                    item => getValue(type, item)
                )),
                color: getEmissionsTypeColor(type).replace('#', '')
            }))
            .filter(item => item.data.some(value => value !== 0));

        if (!series.length) {
            return null;
        }
        const totals = months.map((_, index) =>
            series.reduce((sum, item) => sum + item.data[index], 0)
        );
        const axis = getPptAxisSpec(totals);

        return {
            type: 'chart',
            title: 'Utility Emissions (tonne CO2e)',
            chartType: 'combo',
            labels: months.map(month =>
                month.toLocaleString('en-US', { month: 'short', year: 'numeric' })
            ),
            series,
            yAxisUnit: 'tonne CO2e',
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true
        };
    }

    private buildEmissionsUsageTable(): TableSlide {
        const title = 'Emissions Usage Breakdown';
        let headers = ['Emissions Type', `Total With Market Emissions\n(tonne CO2e)`, `Total With Location Emissions\n(tonne CO2e)`];
        let rows: string[][] = [];

        const emissionTotals = this.facilityOverviewData.emissionsTotals;

        if (emissionTotals.stationaryEmissions) {
            rows.push([
                'Scope 1: Stationary',
                this.formatValue(emissionTotals.stationaryEmissions, false),
                this.formatValue(emissionTotals.stationaryEmissions, false)
            ]);
        }
        if (emissionTotals.mobileTotalEmissions) {
            rows.push([
                'Scope 1: Mobile',
                this.formatValue(emissionTotals.mobileTotalEmissions, false),
                this.formatValue(emissionTotals.mobileTotalEmissions, false)
            ]);
        }
        if (emissionTotals.fugitiveEmissions) {
            rows.push([
                'Scope 1: Fugitive',
                this.formatValue(emissionTotals.fugitiveEmissions, false),
                this.formatValue(emissionTotals.fugitiveEmissions, false)
            ]);
        }
        if (emissionTotals.processEmissions) {
            rows.push([
                'Scope 1: Process',
                this.formatValue(emissionTotals.processEmissions, false),
                this.formatValue(emissionTotals.processEmissions, false)
            ]);
        }
        if (emissionTotals.marketElectricityEmissions || emissionTotals.locationElectricityEmissions) {
            rows.push([
                'Scope 2: Electricity',
                this.formatValue(emissionTotals.marketElectricityEmissions, false),
                this.formatValue(emissionTotals.locationElectricityEmissions, false)
            ]);
        }
        if (emissionTotals.otherScope2Emissions) {
            rows.push([
                'Scope 2: Other',
                this.formatValue(emissionTotals.otherScope2Emissions, false),
                this.formatValue(emissionTotals.otherScope2Emissions, false)
            ]);
        }
        rows.push([
            'Total',
            this.formatValue(emissionTotals.totalWithMarketEmissions, false),
            this.formatValue(emissionTotals.totalWithLocationEmissions, false)
        ]);

        return {
            type: 'table',
            headers,
            rows,
            title
        };
    }

    private buildEmissionsUsageChart(): ChartSlide {
        const emissionsTypes = getEmissionsTypes(this.emissionsDisplay).reverse();
        const allEmissions = this.facilityOverviewData.costMeters
            .map(facilityOverviewMeter => facilityOverviewMeter.emissions);

        const labels: string[] = [];
        const values: number[] = [];
        const barColors: string[] = [];

        const getValue = (emissionsType: EmissionsTypes, emissions: MonthlyData): number => {
            if (emissionsType === 'Scope 1: Fugitive') {
                return emissions.fugitiveEmissions ?? 0;
            }

            if (emissionsType === 'Scope 2: Electricity (Location)') {
                return emissions.locationElectricityEmissions ?? 0;
            }

            if (emissionsType === 'Scope 2: Electricity (Market)') {
                return Math.max(emissions.marketElectricityEmissions ?? 0, 0);
            }

            if (emissionsType === 'Scope 1: Mobile') {
                return emissions.mobileTotalEmissions ?? 0;
            }

            if (emissionsType === 'Scope 1: Process') {
                return emissions.processEmissions ?? 0;
            }

            if (emissionsType === 'Scope 1: Stationary') {
                return emissions.stationaryEmissions ?? 0;
            }

            return emissions.otherScope2Emissions ?? 0;
        };

        emissionsTypes.forEach(emissionsType => {
            const value = _.sumBy(
                allEmissions,
                emissions => getValue(emissionsType, emissions as MonthlyData)
            );

            if (value !== 0) {
                labels.push(emissionsType);
                values.push(value);
                barColors.push(getEmissionsTypeColor(emissionsType).replace('#', ''));
            }
        });

        if (!values.length) {
            return null;
        }

        const total = values.reduce((sum, value) => sum + value, 0);

        const labelsWithPercentages = labels.map((label, index) => {
            const percentage = total === 0
                ? 0
                : (values[index] / total) * 100;

            return `${label} (${percentage.toFixed(1)}%)`;
        });

        const axis = getPptAxisSpec(
            values.filter(value => Number.isFinite(value))
        );

        return {
            type: 'chart',
            title: 'Emission Breakdown',
            chartType: 'bar',
            barDir: 'bar',
            labels: labelsWithPercentages,
            series: [{
                name: 'Emissions',
                data: values
            }],
            barColors,
            yAxisUnit: 'tonne CO2e',
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: false,
            showDataLabels: true
        };
    }

    private buildEmissionsConsumptionTable(
        useAndCostTotal: { end: IUseAndCost; average: IUseAndCost; previousYear: IUseAndCost; },
        previousYear: Date): TableSlide {
        let headers: string[] = [];
        let subHeaders: string[] = [];
        let rows: string[][] = [];

        const endDate = this.dateRange.endDate ? this.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const previousYearDate = previousYear ? previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' }) : '';
        const averageDate = this.dateRange.startDate && this.dateRange.endDate ? `${this.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })} - ${this.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' })}` : '';

        headers = ['', `Latest Month\n(${endDate})`, `Previous Year\n(${previousYearDate})`, `Monthly Average\n(${averageDate})`];
        subHeaders = ['', '(tonne CO2e)', '(tonne CO2e)', '(tonne CO2e)'];

        let showMobile = false, showFugitive = false, showProcess = false, showStationary = false, showScope2LocationElectricity = false, showScope2MarketElectricity = false, showScope2Other = false;
        if (useAndCostTotal) {
            showMobile = (this.checkValue(useAndCostTotal.average.mobileTotalEmissions) || this.checkValue(useAndCostTotal.end.mobileTotalEmissions) || this.checkValue(useAndCostTotal.previousYear.mobileTotalEmissions));
            showFugitive = (this.checkValue(useAndCostTotal.average.fugitiveEmissions) || this.checkValue(useAndCostTotal.end.fugitiveEmissions) || this.checkValue(useAndCostTotal.previousYear.fugitiveEmissions));
            showProcess = (this.checkValue(useAndCostTotal.average.processEmissions) || this.checkValue(useAndCostTotal.end.processEmissions) || this.checkValue(useAndCostTotal.previousYear.processEmissions));
            showStationary = (this.checkValue(useAndCostTotal.average.stationaryEmissions) || this.checkValue(useAndCostTotal.end.stationaryEmissions) || this.checkValue(useAndCostTotal.previousYear.stationaryEmissions));
            showScope2LocationElectricity = (this.checkValue(useAndCostTotal.average.locationElectricityEmissions) || this.checkValue(useAndCostTotal.end.locationElectricityEmissions) || this.checkValue(useAndCostTotal.previousYear.locationElectricityEmissions));
            showScope2MarketElectricity = (this.checkValue(useAndCostTotal.average.marketElectricityEmissions) || this.checkValue(useAndCostTotal.end.marketElectricityEmissions) || this.checkValue(useAndCostTotal.previousYear.marketElectricityEmissions));
            showScope2Other = (this.checkValue(useAndCostTotal.average.otherScope2Emissions) || this.checkValue(useAndCostTotal.end.otherScope2Emissions) || this.checkValue(useAndCostTotal.previousYear.otherScope2Emissions));
        }

        if (showMobile) {
            rows.push([
                'Scope 1: Mobile',
                this.formatValue(useAndCostTotal.end.mobileTotalEmissions, false),
                this.formatValue(useAndCostTotal.previousYear.mobileTotalEmissions, false),
                this.formatValue(useAndCostTotal.average.mobileTotalEmissions, false),
            ]);
        }
        if (showFugitive) {
            rows.push([
                'Scope 1: Fugitive',
                this.formatValue(useAndCostTotal.end.fugitiveEmissions, false),
                this.formatValue(useAndCostTotal.previousYear.fugitiveEmissions, false),
                this.formatValue(useAndCostTotal.average.fugitiveEmissions, false),
            ]);
        }
        if (showProcess) {
            rows.push([
                'Scope 1: Process',
                this.formatValue(useAndCostTotal.end.processEmissions, false),
                this.formatValue(useAndCostTotal.previousYear.processEmissions, false),
                this.formatValue(useAndCostTotal.average.processEmissions, false),
            ]);
        }
        if (showStationary) {
            rows.push([
                'Scope 1: Stationary',
                this.formatValue(useAndCostTotal.end.stationaryEmissions, false),
                this.formatValue(useAndCostTotal.previousYear.stationaryEmissions, false),
                this.formatValue(useAndCostTotal.average.stationaryEmissions, false),
            ]);
        }
        if (this.emissionsDisplay === 'location' && showScope2LocationElectricity) {
            rows.push([
                'Scope 2: Electricity (Location)',
                this.formatValue(useAndCostTotal.end.locationElectricityEmissions, false),
                this.formatValue(useAndCostTotal.previousYear.locationElectricityEmissions, false),
                this.formatValue(useAndCostTotal.average.locationElectricityEmissions, false),
            ]);
        }
        if (this.emissionsDisplay === 'market' && showScope2MarketElectricity) {
            rows.push([
                'Scope 2: Electricity (Market)',
                this.formatValue(useAndCostTotal.end.marketElectricityEmissions, false),
                this.formatValue(useAndCostTotal.previousYear.marketElectricityEmissions, false),
                this.formatValue(useAndCostTotal.average.marketElectricityEmissions, false),
            ]);
        }
        if (showScope2Other) {
            rows.push([
                'Scope 2: Other',
                this.formatValue(useAndCostTotal.end.otherScope2Emissions, false),
                this.formatValue(useAndCostTotal.previousYear.otherScope2Emissions, false),
                this.formatValue(useAndCostTotal.average.otherScope2Emissions, false),
            ]);
        }
        let endVal: number, prevVal: number, avgVal: number;
        if (this.emissionsDisplay === 'market') {
            endVal = useAndCostTotal.end.totalWithMarketEmissions;
            prevVal = useAndCostTotal.previousYear.totalWithMarketEmissions;
            avgVal = useAndCostTotal.average.totalWithMarketEmissions;
        }
        if (this.emissionsDisplay === 'location') {
            endVal = useAndCostTotal.end.totalWithLocationEmissions;
            prevVal = useAndCostTotal.previousYear.totalWithLocationEmissions;
            avgVal = useAndCostTotal.average.totalWithLocationEmissions;
        }

        rows.push([
            'Total',
            this.formatValue(endVal, false),
            this.formatValue(prevVal, false),
            this.formatValue(avgVal, false),
        ]);

        return {
            type: 'table',
            headers,
            subHeaders,
            rows,
            title: 'Emissions Comparison'
        }
    }

    private buildAnnualEmissionsBarChart(annualSourceData: Array<AnnualSourceData>): ChartSlide {
        const annualSourceDataItems = annualSourceData.flatMap(sourceData =>
            sourceData.annualSourceDataItems ?? []
        );

        const years = _.chain(annualSourceDataItems)
            .map(item => item.fiscalYear)
            .uniq()
            .sortBy()
            .value();

        if (!years.length) {
            return null;
        }

        const getValue = (emissionsType: EmissionsTypes, item: AnnualSourceData['annualSourceDataItems'][number]): number => {
            const emissions = item.totalEmissions;

            if (emissionsType === 'Scope 1: Fugitive') {
                return emissions.fugitiveEmissions ?? 0;
            }

            if (emissionsType === 'Scope 2: Electricity (Location)') {
                return emissions.locationElectricityEmissions ?? 0;
            }

            if (emissionsType === 'Scope 2: Electricity (Market)') {
                return emissions.marketElectricityEmissions ?? 0;
            }

            if (emissionsType === 'Scope 1: Mobile') {
                return emissions.mobileTotalEmissions ?? 0;
            }

            if (emissionsType === 'Scope 1: Process') {
                return emissions.processEmissions ?? 0;
            }

            if (emissionsType === 'Scope 1: Stationary') {
                return emissions.stationaryEmissions ?? 0;
            }

            return emissions.otherScope2Emissions ?? 0;
        };

        const series: PptChartSeries[] = getEmissionsTypes(this.emissionsDisplay)
            .map(emissionsType => ({
                name: emissionsType,
                data: years.map(year => {
                    const dataForYear = annualSourceDataItems.filter(item =>
                        item.fiscalYear === year
                    );

                    return _.sumBy(dataForYear, item =>
                        getValue(emissionsType, item)
                    );
                }),
                color: getEmissionsTypeColor(emissionsType).replace('#', '')
            }))
            .filter(chartSeries => chartSeries.data.some(value => value !== 0));

        if (!series.length) {
            return null;
        }

        const values = series
            .flatMap(chartSeries => chartSeries.data)
            .filter(value => Number.isFinite(value));

        const axis = getPptAxisSpec(values);

        return {
            type: 'chart',
            title: 'Annual Utility Emissions (tonne CO2e)',
            chartType: 'bar',
            labels: years.map(year =>
                this.facility.fiscalYear === 'nonCalendarYear'
                    ? `FY - ${year}`
                    : year.toString()
            ),
            series,
            yAxisUnit: 'tonne CO2e',
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: axis.labelFormat,
            showLegend: true
        };
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

        const monthKeys: string[] = [];
        const startDate = new Date(this.dateRange.startDate.getFullYear(), this.dateRange.startDate.getMonth(), 1);
        const endDate = new Date(this.dateRange.endDate.getFullYear(), this.dateRange.endDate.getMonth(), 1);

        for (const date = new Date(startDate); date <= endDate; date.setMonth(date.getMonth() + 1)) {
            monthKeys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
        }
        if (!monthKeys.length) return null;

        const getValue = (monthlyData: MonthlyData): number => {
            if (sectionType === 'energyUse') {
                return monthlyData.energyUse ?? 0;
            }

            if (sectionType === 'water') {
                return monthlyData.energyConsumption ?? 0;
            }

            return monthlyData.energyCost ?? 0;
        };

        const series: PptChartSeries[] = filteredMeters.map(cMeter => {
            const valueByMonth = new Map<string, number>();

            cMeter.monthlyData.forEach(monthlyData => {
                const date = new Date(monthlyData.date);

                if (date < startDate || date > endDate) {
                    return;
                }

                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                valueByMonth.set(key, (valueByMonth.get(key) ?? 0) + getValue(monthlyData));
            });

            return {
                name: cMeter.meter.name,
                type: 'area',
                data: monthKeys.map(key => valueByMonth.get(key) ?? 0),
                color: UtilityColors[cMeter.meter.source]?.color?.replace('#', '') ?? '999999'
            };
        });

        const hasData = series.some(chartSeries =>
            chartSeries.data.some(value => value !== 0)
        );

        if (!hasData) {
            return null;
        }

        const stackedTotals = monthKeys.map((_, index) =>
            series.reduce((total, chartSeries) => total + (chartSeries.data[index] ?? 0), 0)
        );

        const axis = getPptAxisSpec(
            stackedTotals.filter(value => Number.isFinite(value))
        );

        const yAxisUnit = sectionType === 'water'
            ? this.facility.volumeLiquidUnit
            : sectionType === 'cost'
                ? 'Cost ($)'
                : this.facility.energyUnit;

        const title = sectionType === 'water'
            ? `Water Usage (${yAxisUnit})`
            : sectionType === 'cost'
                ? 'Utility Costs'
                : `Utility Usage (${yAxisUnit})`;

        return {
            type: 'chart',
            title,
            chartType: 'combo',
            labels: monthKeys.map(key => {
                const [year, month] = key.split('-');
                return new Date(+year, +month - 1, 1).toLocaleString('en-US', {
                    month: 'short',
                    year: 'numeric'
                });
            }),
            series,
            yAxisUnit,
            valAxisMinVal: axis.min,
            valAxisMaxVal: axis.max,
            valAxisMajorUnit: axis.majorUnit,
            valAxisLabelFormatCode: sectionType === 'cost'
                ? '$#,##0'
                : axis.labelFormat,
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

    private buildMonthlyLineChart(sectionType: 'energyUse' | 'cost' | 'water' | 'emissions', yearMonthData: Array<YearMonthData>): ChartSlide {
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
                if (sectionType === 'emissions') {
                    if (this.emissionsDisplay === 'location') {
                        return row.totalWithLocationEmissions ?? 0;
                    }
                    if (this.emissionsDisplay === 'market') {
                        return row.totalWithMarketEmissions ?? 0;
                    }
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
        const yAxisUnit = sectionType === 'emissions' ? '' : sectionType === 'water' ? this.facility.volumeLiquidUnit : sectionType === 'cost' ? 'Cost ($)' : this.facility.energyUnit;
        const title = sectionType === 'emissions' ? 'Utility Emissions (tonne CO2e)' : sectionType === 'cost' ? 'Utility Costs' : sectionType === 'water' ? `Water Usage (${yAxisUnit})` : `Utility Usage (${yAxisUnit})`;
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

    checkValue(value: number): boolean {
        if (value) {
            return true;
        }
        return false;
    }
}