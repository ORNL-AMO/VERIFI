import { inject, Injectable } from "@angular/core";
import * as _ from "lodash";
import { DataOverviewFacilityReportSettings, IdbFacilityReport } from "@data/models/idbModels/facilityReport";
import { ReportDocument, ReportMetaData } from "@v0/shared/pdf-report/models/report-document.model";
import { BaseSection, ChartSection, HeadingSection, StyledTextSection, TableHeaderCell, TableSection } from "@v0/shared/pdf-report/models/report-section.model";
import { CustomNumberPipe } from "@v0/shared/helper-pipes/custom-number.pipe";
import { IUseAndCost, UseAndCost } from "@domain/calculations/dashboard-calculations/useAndCostClass";
import { DataOverviewReportSetup } from "@data/models/overview-report";
import { DataOverviewAccount, DataOverviewFacility } from "@v0/data-evaluation/account/account-reports/data-overview-report/data-overview-report.component";
import { IdbAccount } from "@data/models/idbModels/account";
import { IdbAccountReport } from "@data/models/idbModels/accountReport";
import { NaicsDisplayPipe } from "@v0/shared/helper-pipes/naics-display.pipe";
import { AccountOverviewFacility } from "@domain/calculations/dashboard-calculations/accountOverviewClass";
import { FacilityOverviewReportAdapter } from "@v0/data-evaluation/facility/facility-reports/report-results/facility-overview-report-results/facility-overview-report.adapter";
import { EmissionsResults } from "@app/data/models/eGridEmissions";
import { formatDate } from "@angular/common";

@Injectable({ providedIn: 'root' })
export class DataOverviewReportAdapter {

    private naicsDisplayPipe: NaicsDisplayPipe = inject(NaicsDisplayPipe);
    private customNumberPipe: CustomNumberPipe = inject(CustomNumberPipe);
    private facilityOverviewReportAdapter = inject(FacilityOverviewReportAdapter);

    account: IdbAccount;
    report: IdbAccountReport;
    reportSettings: DataOverviewReportSetup;
    accountData: DataOverviewAccount;
    chartImageProviders?: any;
    energyUnit: string;
    waterUnit: string;
    emissionsDisplay: "location" | "market";

    private mapAccountToFacilitySettings(): DataOverviewFacilityReportSettings {
        return {
            startYear: this.report.startYear,
            startMonth: this.report.startMonth,
            endYear: this.report.endYear,
            endMonth: this.report.endMonth,
            energyIsSource: this.reportSettings.energyIsSource,
            emissionsDisplay: this.reportSettings.emissionsDisplay,
            includeEnergySection: this.reportSettings.includeEnergySection,
            includeCostsSection: this.reportSettings.includeCostsSection,
            includeEmissionsSection: this.reportSettings.includeEmissionsSection,
            includeWaterSection: this.reportSettings.includeWaterSection,
            includeAllMeterData: this.reportSettings.includeAllMeterData,
            includedGroups: [],
            includeMeterUsageStackedLineChart: this.reportSettings.includeMeterUsageStackedLineChart,
            includeMeterUsageTable: this.reportSettings.includeMeterUsageTable,
            includeMeterUsageDonut: this.reportSettings.includeMeterUsageDonut,
            includeUtilityTableForFacility: this.reportSettings.includeUtilityTableForFacility,
            includeAnnualBarChart: this.reportSettings.includeAnnualBarChart,
            includeMonthlyLineChartForFacility: this.reportSettings.includeMonthlyLineChartForFacility
        };
    }

    buildFacilityReport(facilityId: string): IdbFacilityReport {
        return {
            guid: '',
            createdDate: this.report.createdDate,
            modifiedDate: this.report.modifiedDate,
            facilityId,
            accountId: this.account.guid,
            name: '',
            facilityReportType: 'overview',
            analysisItemId: undefined,
            analysisReportSettings: undefined,
            dataOverviewReportSettings: this.mapAccountToFacilitySettings(),
            savingsReportSettings: undefined,
            emissionFactorsReportSettings: undefined,
            modelingReportSettings: undefined,
            costSavingsReportSettings: undefined,
            dataQualityReportSettings: undefined
        };
    }

    buildDocument(input: DataOverviewReportData): ReportDocument {
        const sections: BaseSection[] = [];
        this.account = input.account;
        this.report = input.report;
        this.reportSettings = input.overviewReport;
        this.accountData = input.accountData;
        this.chartImageProviders = input.chartImageProviders;
        this.waterUnit = this.account.volumeLiquidUnit;
        this.energyUnit = this.account.energyUnit;
        this.emissionsDisplay = input.emissionsDisplay;

        let metadata: ReportMetaData = {
            title: '',
            dateGenerated: '',
            moduleColor: [20, 90, 50],
            skipPage: true
        };

        if (this.reportSettings.includeAccountReport) {
            sections.push(...this.buildTitleSection(true));

            if (!this.accountData.calculationError) {
                if (this.reportSettings.includeEnergySection) {
                    const headingSection: HeadingSection = {
                        type: 'heading',
                        title: 'Account Energy Consumption'
                    };
                    sections.push(headingSection);
                    sections.push(...this.buildSection('energyUse', 'Energy Consumption'));
                }
                if (this.reportSettings.includeWaterSection) {
                    const headingSection: HeadingSection = {
                        type: 'heading',
                        title: 'Account Water Consumption'
                    };
                    sections.push(headingSection);
                    sections.push(...this.buildSection('water', 'Water Consumption'));
                }
                if (this.reportSettings.includeCostsSection) {
                    const headingSection: HeadingSection = {
                        type: 'heading',
                        title: 'Account Costs'
                    };
                    sections.push(headingSection);
                    sections.push(...this.buildSection('cost', 'Account Costs'));
                }
                if (this.account.displayEmissions && this.reportSettings.includeEmissionsSection) {
                    const headingSection: HeadingSection = {
                        type: 'heading',
                        title: 'Account Emissions'
                    };
                    sections.push(headingSection);
                    sections.push(...this.buildAccountEmissionSection());
                }
            }
        }

        if (this.reportSettings.includeFacilityReports) {
            for (const facilityData of input.facilitiesData) {
                sections.push(...this.buildTitleSection(false, facilityData));
                const facilityDocument = this.facilityOverviewReportAdapter.buildDocument({
                    facilityReport: this.buildFacilityReport(facilityData.facility.guid),
                    facility: facilityData.facility,
                    facilityOverviewData: facilityData.facilityOverviewData,
                    utilityUseAndCost: facilityData.utilityUseAndCost,
                    dateRange: facilityData.dateRange,
                    emissionsDisplay: input.emissionsDisplay,
                    chartImageProviders: input.facilityChartImageProviders?.[facilityData.facility.guid],
                    emissionsChartImageProviders: input.facilityEmissionsChartImageProviders?.[facilityData.facility.guid]
                });
                sections.push(...facilityDocument.sections);
            }
        }
        return {
            metadata,
            sections
        };
    }

    private buildTitleSection(isAccountReport: boolean, facilityData?: DataOverviewFacility): BaseSection[] {
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
            name = facilityData?.facility.name ?? '';
            address = facilityData?.facility.address ? this.formatAddress(facilityData?.facility.address, facilityData?.facility.city, facilityData?.facility.state, facilityData?.facility.zip, facilityData?.facility.country) : '';
            naics = this.naicsDisplayPipe.transform(facilityData?.facility) ? `NAICS: ${this.naicsDisplayPipe.transform(facilityData?.facility)}` : '';
            eGridSubregion = facilityData?.facility.eGridSubregion ? `eGrid Subregion: ${facilityData?.facility.eGridSubregion}` : '';
            notes = facilityData?.facility.notes ? `Notes: ${facilityData?.facility.notes}` : '';
        }
        const titleSection: StyledTextSection = {
            type: 'styledText',
            content: [
                { text: name, fontSize: 16, bold: true, spaceAfter: 10, align: 'center' },
                { text: address, fontSize: 12, spaceAfter: 6, align: 'center' },
                { text: naics, fontSize: 12, spaceAfter: 6, align: 'center' },
                { text: eGridSubregion, fontSize: 12, spaceAfter: 8, align: 'center' },
                { text: notes, fontSize: 12, spaceAfter: 6, align: 'center' },
                { text: 'Data Overview Report', fontSize: 14, bold: true, spaceAfter: 6, align: 'center' },
                { text: `(${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: "short", year: "numeric" })})`, fontSize: 14, bold: true, spaceAfter: 8, align: 'center' },
                { text: reportName, fontSize: 14, bold: true, spaceAfter: 10, align: 'center' },
                { text: `This report was generated by VERIFI ${currentDate}`, fontSize: 12, align: 'center' },
            ],
            pageBreakAfter: true,
            tocInclude: isAccountReport ? true : false,
            tocLabel: isAccountReport ? 'Account Overview' : '',
            bookmarkLevel: 0
        };
        return [titleSection];
    }

    private buildSection(type: 'energyUse' | 'cost' | 'water', title: string) {
        let sections: BaseSection[] = [];
        if (this.reportSettings.includeMap) {
            let chartSection = this.createChartSection(this.chartImageProviders?.utilityUsageMap?.[type], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `${title} Map`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeFacilityTable) {
            let tableSection = this.buildFacilityTableSection(type, `${title} Breakdown By Facility`);
            if (tableSection) {
                tableSection.tocInclude = true;
                tableSection.tocLabel = `${title} Breakdown By Facility Table`;
                tableSection.bookmarkLevel = 1;
                tableSection.pageBreakAfter = true;
                sections.push(tableSection);
            }
        }
        if (this.reportSettings.includeFacilityDonut) {
            let chartSection = this.createChartSection(this.chartImageProviders?.usageDonut?.[type], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `${title} Breakdown Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeFacilityTable) {
            let tableSection: TableSection | undefined;
            tableSection = this.buildUtilityTableSection(type, `${title} Breakdown By Utility`);
            if (tableSection) {
                tableSection.tocInclude = true;
                tableSection.tocLabel = `${title} Breakdown By Utility Table`;
                tableSection.bookmarkLevel = 1;
                tableSection.pageBreakAfter = true;
                sections.push(tableSection);
            }
        }
        if (this.reportSettings.includeFacilityDonut) {
            let chartSection: ChartSection | undefined;
            chartSection = this.createChartSection(this.chartImageProviders?.utilityUsageDonut?.[type], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `${title} Breakdown By Utility Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeUtilityTable) {
            let tableSection = this.buildUtilityConsumptionTableSection(type, `${title} By Utility Comparison`);
            if (tableSection) {
                tableSection.tocInclude = true;
                tableSection.tocLabel = `${title} By Utility Comparison Table`;
                tableSection.bookmarkLevel = 1;
                tableSection.pageBreakAfter = true;
                sections.push(tableSection);
            }
        }
        if (this.reportSettings.includeStackedBarChart) {
            let chartSection = this.createChartSection(this.chartImageProviders?.utilityUsageStackedBar?.[type], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `${title} Stacked Bar Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeMonthlyLineChart) {
            let chartSection = this.createChartSection(this.chartImageProviders?.monthlyUsageLineChart?.[type], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `Monthly ${title} Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }

        return sections;
    }

    private buildAccountEmissionSection(): BaseSection[] {
        let sections: BaseSection[] = [];
        if (this.reportSettings.includeMap) {
            let chartSection = this.createChartSection(this.chartImageProviders?.utilityUsageMap?.['emissions'], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = 'Account Emissions Map';
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeFacilityTable) {
            let tableSection = this.buildFacilityTableSection('emissions', `Emissions Breakdown By Facility`);
            if (tableSection) {
                tableSection.tocInclude = true;
                tableSection.tocLabel = `Emissions Breakdown By Facility Table`;
                tableSection.bookmarkLevel = 1;
                tableSection.pageBreakAfter = true;
                sections.push(tableSection);
            }
        }
        if (this.reportSettings.includeFacilityDonut) {
            let chartSection = this.createChartSection(this.chartImageProviders?.usageDonut?.['emissions'], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `Emissions Breakdown By Facility Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeFacilityTable) {
            let tableSection: TableSection | undefined;
            tableSection = this.buildEmissionsUsageTableSection();
            if (tableSection) {
                tableSection.tocInclude = true;
                tableSection.tocLabel = `$Emissions Breakdown Table`;
                tableSection.bookmarkLevel = 1;
                tableSection.pageBreakAfter = true;
                sections.push(tableSection);
            }
        }
        if (this.reportSettings.includeFacilityDonut) {
            let chartSection: ChartSection | undefined;
            chartSection = this.createChartSection(this.chartImageProviders?.utilityUsageDonut?.['emissions'], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `Emissions Breakdown Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeUtilityTable) {
            let tableSection = this.buildEmissionsUtilityTableSection();
            if (tableSection) {
                tableSection.tocInclude = true;
                tableSection.tocLabel = `Account Emissions Comparison Table`;
                tableSection.bookmarkLevel = 1;
                tableSection.pageBreakAfter = true;
                sections.push(tableSection);
            }
        }
        if (this.reportSettings.includeStackedBarChart) {
            let chartSection = this.createChartSection(this.chartImageProviders?.utilityUsageStackedBar?.['emissions'], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `Emissions Stacked Bar Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        if (this.reportSettings.includeMonthlyLineChart) {
            let chartSection = this.createChartSection(this.chartImageProviders?.monthlyUsageLineChart?.['emissions'], '');
            if (chartSection) {
                chartSection.tocInclude = true;
                chartSection.tocLabel = `Monthly Emissions Chart`;
                chartSection.bookmarkLevel = 1;
                chartSection.pageBreakAfter = true;
                sections.push(chartSection);
            }
        }
        return sections;
    }

    private buildFacilityTableSection(type: 'energyUse' | 'cost' | 'water' | 'emissions', title: string): TableSection | undefined {
        let headers: string[] = [];
        let rows: string[][] = [];
        let accountOverviewFacilities: Array<AccountOverviewFacility> = [];
        let totalConsumption: number;
        let totalCost: number;

        if (type === 'energyUse') {
            headers = ['Facility', `Utility Usage (${this.energyUnit})`, 'Utility Cost'];
            accountOverviewFacilities = this.accountData.accountOverviewData.facilitiesEnergy;
            totalConsumption = this.accountData.accountOverviewData.totalEnergyUsage;
            totalCost = this.accountData.accountOverviewData.totalEnergyCost;
        }
        if (type === 'cost') {
            headers = ['Facility', '# of Meters', 'Utility Cost'];
            accountOverviewFacilities = this.accountData.accountOverviewData.facilitiesCost;
            totalConsumption = this.accountData.accountOverviewData.numberOfMeters;
            totalCost = this.accountData.accountOverviewData.totalAccountCost;
        }
        if (type === 'water') {
            headers = ['Facility', `Water Consumption (${this.waterUnit})`, 'Utility Cost'];
            accountOverviewFacilities = this.accountData.accountOverviewData.facilitiesWater;
            totalConsumption = this.accountData.accountOverviewData.totalWaterConsumption;
            totalCost = this.accountData.accountOverviewData.totalWaterCost;
        }
        if (type === 'emissions') {
            headers = ['Facility', 'Total With Market Emissions (tonne CO2e)', 'Total With Location Emissions (tonne CO2e)'];
            if (this.emissionsDisplay === 'location') {
                accountOverviewFacilities = _.orderBy(this.accountData.accountOverviewData.facilitiesCost, (accountOverviewFacility: AccountOverviewFacility) => {
                    return accountOverviewFacility.emissions.totalWithLocationEmissions
                }, 'desc');
            } else {
                accountOverviewFacilities = _.orderBy(this.accountData.accountOverviewData.facilitiesCost, (accountOverviewFacility: AccountOverviewFacility) => {
                    return accountOverviewFacility.emissions.totalWithMarketEmissions
                }, 'desc');
            }
        }


        if (accountOverviewFacilities) {
            for (let summary of accountOverviewFacilities) {
                if (type !== 'emissions') {
                    rows.push([
                        summary.facility.name,
                        type === 'cost' ? summary.numberOfMeters.toString() : this.checkNumber(summary.totalUsage),
                        this.checkCurrency(summary.totalCost)
                    ]);
                }
                else {
                    rows.push([
                        summary.facility.name,
                        this.checkNumber(summary.emissions.totalWithMarketEmissions),
                        this.checkNumber(summary.emissions.totalWithLocationEmissions)
                    ]);
                }
            }
        }
        if (type !== 'emissions') {
            rows.push([
                'Total',
                this.checkNumber(totalConsumption),
                this.checkCurrency(totalCost)
            ]);
        }
        else {
            rows.push([
                'Total',
                this.checkNumber(this.accountData.accountOverviewData.emissionsTotals.totalWithMarketEmissions),
                this.checkNumber(this.accountData.accountOverviewData.emissionsTotals.totalWithLocationEmissions)
            ]);
        }

        return {
            type: 'table',
            headers: headers,
            rows: rows,
            title: title
        };
    }

    private buildUtilityTableSection(type: 'energyUse' | 'cost' | 'water', title: string): TableSection | undefined {
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


        if (type === 'energyUse') {
            headers = ['Utility', `Utility Usage (${this.energyUnit})`, 'Utility Cost'];
            totalUsage = this.accountData.accountOverviewData.totalEnergyUsage;
            totalCost = this.accountData.accountOverviewData.totalEnergyCost;
            allSources.forEach(source => {
                if (source.energyUse) {
                    rows.push([
                        source.sourceLabel,
                        this.checkNumber(source.energyUse),
                        this.checkCurrency(source.cost)
                    ]);
                }
            });
        }
        if (type === 'cost') {
            headers = ['Utility', '# of Meters', 'Utility Cost'];
            totalUsage = this.accountData.accountOverviewData.numberOfMeters;
            totalCost = this.accountData.accountOverviewData.totalEnergyCost;
            allSources.forEach(source => {
                if (source.cost) {
                    rows.push([
                        source.sourceLabel,
                        source.numberOfMeters.toString(),
                        this.checkCurrency(source.cost)
                    ]);
                }
            });
        }
        if (type === 'water') {
            headers = ['Utility', `Water Consumption (${this.waterUnit})`, 'Water Cost'];
            totalUsage = this.accountData.accountOverviewData.totalWaterConsumption;
            totalCost = this.accountData.accountOverviewData.totalWaterCost;
            this.accountData.accountOverviewData.waterTypeData.forEach(waterTotal => {
                rows.push([
                    waterTotal.waterType,
                    this.checkNumber(waterTotal.totalConsumption),
                    this.checkCurrency(waterTotal.totalCost)
                ]);
            });
        }

        rows.push([
            'Total',
            this.checkNumber(totalUsage),
            this.checkCurrency(totalCost)
        ]);

        let tableSection: TableSection = {
            type: 'table',
            headers: headers,
            rows: rows,
            title: title
        };
        return tableSection;
    }

    private buildEmissionsUsageTableSection(): TableSection {
        let headers: string[] = ['Emissions Type', 'Total With Market Emissions (tonne CO2e)', 'Total With Location Emissions (tonne CO2e)'];
        let rows: string[][] = [];

        const emissionTotals: EmissionsResults = this.accountData.accountOverviewData.emissionsTotals;

        if (emissionTotals.stationaryEmissions) {
            rows.push([
                'Scope 1: Stationary',
                this.checkNumber(emissionTotals.stationaryEmissions),
                this.checkNumber(emissionTotals.stationaryEmissions)
            ]);
        }
        if (emissionTotals.mobileTotalEmissions) {
            rows.push([
                'Scope 1: Mobile',
                this.checkNumber(emissionTotals.mobileTotalEmissions),
                this.checkNumber(emissionTotals.mobileTotalEmissions)
            ]);
        }
        if (emissionTotals.fugitiveEmissions) {
            rows.push([
                'Scope 1: Fugitive',
                this.checkNumber(emissionTotals.fugitiveEmissions),
                this.checkNumber(emissionTotals.fugitiveEmissions)
            ]);
        }
        if (emissionTotals.processEmissions) {
            rows.push([
                'Scope 1: Process',
                this.checkNumber(emissionTotals.processEmissions),
                this.checkNumber(emissionTotals.processEmissions)
            ]);
        }
        if (emissionTotals.marketElectricityEmissions || emissionTotals.locationElectricityEmissions) {
            rows.push([
                'Scope 2: Electricity',
                this.checkNumber(emissionTotals.marketElectricityEmissions),
                this.checkNumber(emissionTotals.locationElectricityEmissions)
            ]);
        }
        if (emissionTotals.otherScope2Emissions) {
            rows.push([
                'Scope 2: Other',
                this.checkNumber(emissionTotals.otherScope2Emissions),
                this.checkNumber(emissionTotals.otherScope2Emissions)
            ]);
        }
        rows.push([
            'Total',
            this.checkNumber(emissionTotals.totalWithMarketEmissions),
            this.checkNumber(emissionTotals.totalWithLocationEmissions)
        ]);

        const tableSection: TableSection = {
            type: 'table',
            title: 'Emissions Breakdown',
            headers: headers,
            rows: rows
        };

        return tableSection;
    }


    private buildUtilityConsumptionTableSection(type: 'energyUse' | 'cost' | 'water', title: string): TableSection | undefined {
        let headers: Array<string | TableHeaderCell> = [];
        let subheaders: Array<string | TableHeaderCell> = [];
        let rows: string[][] = [];
        let endDate = this.accountData.dateRange.endDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        let previousYear = this.accountData.utilityUseAndCost.previousYear.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        let dateRange = this.accountData.dateRange.startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }) + ' - ' + endDate;
        let sourceUseAndCost: Array<UseAndCost> = [];
        let useAndCostTotal: {
            end: IUseAndCost;
            average: IUseAndCost;
            previousYear: IUseAndCost;
        };

        if (type === 'cost') {
            sourceUseAndCost = this.accountData.utilityUseAndCost.allSourcesUseAndCost;
            useAndCostTotal = this.accountData.utilityUseAndCost.allSourcesTotal;
            headers = ['Utility', `Latest Month \n(${endDate})`, `Previous Year \n(${previousYear})`, `Monthly Average \n(${dateRange})`];

            sourceUseAndCost.forEach(source => {
                rows.push([
                    source.source,
                    this.checkCurrency(source.end.cost),
                    this.checkCurrency(source.previousYear.cost),
                    this.checkCurrency(source.average.cost)
                ]);
            });

            rows.push([
                'Total',
                this.checkCurrency(useAndCostTotal.end.cost),
                this.checkCurrency(useAndCostTotal.previousYear.cost),
                this.checkCurrency(useAndCostTotal.average.cost)
            ]);
        }
        else {
            if (type === 'energyUse') {
                sourceUseAndCost = this.accountData.utilityUseAndCost.energyUseAndCost;
                useAndCostTotal = this.accountData.utilityUseAndCost.energyTotal;
                headers = [
                    { content: '', colSpan: 1 },
                    { content: `Latest Month \n(${endDate})`, colSpan: 2 },
                    { content: `Previous Year \n(${previousYear})`, colSpan: 2 },
                    { content: `Monthly Average \n(${dateRange})`, colSpan: 2 }
                ];
                subheaders = ['Utility', `Utility Use (${this.energyUnit})`, 'Utility Cost', `Utility Use (${this.energyUnit})`, 'Utility Cost', `Utility Use (${this.energyUnit})`, 'Utility Cost'];
            }
            if (type === 'water') {
                sourceUseAndCost = this.accountData.utilityUseAndCost.waterUseAndCost;
                useAndCostTotal = this.accountData.utilityUseAndCost.waterTotal;
                headers = [
                    { content: '', colSpan: 1 },
                    { content: `Latest Month \n(${endDate})`, colSpan: 2 },
                    { content: `Previous Year \n(${previousYear})`, colSpan: 2 },
                    { content: `Monthly Average \n(${dateRange})`, colSpan: 2 }
                ];
                subheaders = ['Utility', `Utility Use (${this.waterUnit})`, 'Utility Cost', `Utility Use (${this.waterUnit})`, 'Utility Cost', `Utility Use (${this.waterUnit})`, 'Utility Cost'];
            }
            sourceUseAndCost.forEach(source => {
                rows.push([
                    source.source,
                    this.checkNumber(source.end.energyUse),
                    this.checkCurrency(source.end.cost),
                    this.checkNumber(source.previousYear.energyUse),
                    this.checkCurrency(source.previousYear.cost),
                    this.checkNumber(source.average.energyUse),
                    this.checkCurrency(source.average.cost)
                ]);
            });

            rows.push([
                'Total',
                this.checkNumber(useAndCostTotal.end.energyUse),
                this.checkCurrency(useAndCostTotal.end.cost),
                this.checkNumber(useAndCostTotal.previousYear.energyUse),
                this.checkCurrency(useAndCostTotal.previousYear.cost),
                this.checkNumber(useAndCostTotal.average.energyUse),
                this.checkCurrency(useAndCostTotal.average.cost)
            ]);
        }

        let tableSection: TableSection = {
            type: 'table',
            headers: headers,
            subHeaders: subheaders.length > 0 ? subheaders : undefined,
            rows: rows,
            title: title
        };
        return tableSection;
    }

    private buildEmissionsUtilityTableSection(): TableSection {
        const endDate: string = this.accountData.dateRange.endDate ? '(' + this.formatDate(this.accountData.dateRange.endDate) + ')' : '';
        const previousYear: string = this.accountData.utilityUseAndCost.previousYear ? '(' + this.formatDate(this.accountData.utilityUseAndCost.previousYear) + ')' : '';
        const dateRange: string = this.accountData.dateRange.startDate ? '(' + this.formatDate(this.accountData.dateRange.startDate) + ' - ' + this.formatDate(this.accountData.dateRange.endDate) + ')' : '';
        let headers = ['', `Latest Month \n${endDate}`, `Previous Year \n${previousYear}`, `Monthly Average \n${dateRange}`];
        let subheaders = ['', '(tonne CO2e)', '(tonne CO2e)', '(tonne CO2e)'];
        let rows: string[][] = [];

        let showMobile = false, showFugitive = false, showProcess = false, showStationary = false, showScope2LocationElectricity = false, showScope2MarketElectricity = false, showScope2Other = false;
        let useAndCostTotal = this.accountData.utilityUseAndCost.allSourcesTotal;
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
                this.checkNumber(useAndCostTotal.end.mobileTotalEmissions),
                this.checkNumber(useAndCostTotal.previousYear.mobileTotalEmissions),
                this.checkNumber(useAndCostTotal.average.mobileTotalEmissions)
            ]);
        }
        if (showFugitive) {
            rows.push([
                'Scope 1: Fugitive',
                this.checkNumber(useAndCostTotal.end.fugitiveEmissions),
                this.checkNumber(useAndCostTotal.previousYear.fugitiveEmissions),
                this.checkNumber(useAndCostTotal.average.fugitiveEmissions)
            ]);
        }
        if (showProcess) {
            rows.push([
                'Scope 1: Process',
                this.checkNumber(useAndCostTotal.end.processEmissions),
                this.checkNumber(useAndCostTotal.previousYear.processEmissions),
                this.checkNumber(useAndCostTotal.average.processEmissions)
            ]);
        }
        if (showStationary) {
            rows.push([
                'Scope 1: Stationary',
                this.checkNumber(useAndCostTotal.end.stationaryEmissions),
                this.checkNumber(useAndCostTotal.previousYear.stationaryEmissions),
                this.checkNumber(useAndCostTotal.average.stationaryEmissions)
            ]);
        }
        if (this.emissionsDisplay === 'location' && showScope2LocationElectricity) {
            rows.push([
                'Scope 2: Electricity (Location)',
                this.checkNumber(useAndCostTotal.end.locationElectricityEmissions),
                this.checkNumber(useAndCostTotal.previousYear.locationElectricityEmissions),
                this.checkNumber(useAndCostTotal.average.locationElectricityEmissions)
            ]);
        }
        if (this.emissionsDisplay === 'market' && showScope2MarketElectricity) {
            rows.push([
                'Scope 2: Electricity (Market)',
                this.checkNumber(useAndCostTotal.end.marketElectricityEmissions),
                this.checkNumber(useAndCostTotal.previousYear.marketElectricityEmissions),
                this.checkNumber(useAndCostTotal.average.marketElectricityEmissions)
            ]);
        }
        if (showScope2Other) {
            rows.push([
                'Scope 2: Other',
                this.checkNumber(useAndCostTotal.end.otherScope2Emissions),
                this.checkNumber(useAndCostTotal.previousYear.otherScope2Emissions),
                this.checkNumber(useAndCostTotal.average.otherScope2Emissions)
            ]);
        }
        let totalEnd: string, totalPrevious: string, totalAverage: string;
        if (this.emissionsDisplay === 'market') {
            totalEnd = this.checkNumber(useAndCostTotal.end.totalWithMarketEmissions);
            totalPrevious = this.checkNumber(useAndCostTotal.previousYear.totalWithMarketEmissions);
            totalAverage = this.checkNumber(useAndCostTotal.average.totalWithMarketEmissions);
        }
        if (this.emissionsDisplay === 'location') {
            totalEnd = this.checkNumber(useAndCostTotal.end.totalWithLocationEmissions);
            totalPrevious = this.checkNumber(useAndCostTotal.previousYear.totalWithLocationEmissions);
            totalAverage = this.checkNumber(useAndCostTotal.average.totalWithLocationEmissions);
        }
        rows.push([
            'Total',
            totalEnd,
            totalPrevious,
            totalAverage
        ]);

        const tableSection: TableSection = {
            type: 'table',
            title: 'Utility Emissions Comparison',
            headers: headers,
            subHeaders: subheaders,
            rows: rows
        };

        return tableSection;
    }

    private createChartSection(chartImageProvider: any, title: string) {
        const chartSection: ChartSection = {
            type: 'chart',
            title: title,
            imageDataProvider: chartImageProvider ? chartImageProvider : undefined
        };
        return chartSection;
    }

    formatDate(date: Date): string {
        if (!date) {
            return '-';
        }
        return formatDate(date, 'MMM, yyyy', 'en-US');
    }

    checkValue(value: number): boolean {
        if (value) {
            return true;
        }
        return false;
    }

    checkNumber(value: number): string {
        if (isNaN(value) || value === null || value === undefined || value === 0) {
            return '\u2014';
        }
        return this.customNumberPipe.transform(value);
    }

    checkCurrency(value: number): string {
        if (isNaN(value) || value === null || value === undefined || value === 0) {
            return '\u2014';
        }
        return this.customNumberPipe.transform(value, true);
    }

    formatAddress(address?: string, city?: string, state?: string, zip?: string, country?: string): string {
        return [address, city, [state, zip].filter(Boolean).join(' '), country]
            .filter(Boolean)
            .join(', ');
    }
}

export interface DataOverviewReportData {
    account: IdbAccount;
    report: IdbAccountReport;
    overviewReport: DataOverviewReportSetup;
    accountData: DataOverviewAccount;
    facilitiesData: Array<DataOverviewFacility>;
    emissionsDisplay: "market" | "location";
    chartImageProviders?: {
        utilityUsageMap?: Record<string, () => Promise<string>>;
        usageDonut?: Record<string, () => Promise<string>>;
        utilityUsageDonut?: Record<string, () => Promise<string>>;
        utilityUsageStackedBar?: Record<string, () => Promise<string>>;
        monthlyUsageLineChart?: Record<string, () => Promise<string>>;
    };
    facilityChartImageProviders?: Record<string, {
        meterStackedLineChart?: Record<string, () => Promise<string>>;
        meterBarChart?: Record<string, () => Promise<string>>;
        annualBarChart?: Record<string, () => Promise<string>>;
        monthlyUsageLineChart?: Record<string, () => Promise<string>>;
    }>;
    facilityEmissionsChartImageProviders?: Record<string, {
        meterStackedLineChartEmissions?: () => Promise<string>;
        emissionsBarChart?: () => Promise<string>;
        annualBarChartEmissions?: () => Promise<string>;
        monthlyUsageLineChartEmissions?: () => Promise<string>;
    }>;
}
