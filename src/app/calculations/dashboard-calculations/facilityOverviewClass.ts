import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { YearMonthData } from "src/app/models/dashboard";
import { AllSources, EnergySources, IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource, WaterSources } from "src/app/models/idb";
import { getFiscalYear, getYearlyUsageNumbers } from "../shared-calculations/calanderizationFunctions";
import * as _ from 'lodash';

export class FacilityOverviewData {


    annualSourceData: Array<AnnualSourceData>;

    energyYearMonthData: Array<YearMonthData>;
    waterYearMonthData: Array<YearMonthData>;
    allSourcesYearMonthData: Array<YearMonthData>;

    energyMeters: Array<FacilityOverviewMeter>;
    totalEnergyUsage: number;
    totalEnergyCost: number;
    totalMarketEmissions: number;
    totalLocationEmissions: number;

    costMeters: Array<FacilityOverviewMeter>;
    totalFacilityCost: number;

    waterMeters: Array<FacilityOverviewMeter>;
    totalWaterConsumption: number;
    totalWaterCost: number;
    calanderizedMeters: Array<CalanderizedMeter>;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }, facility: IdbFacility) {
        this.calanderizedMeters = calanderizedMeters;
        //energy
        this.setEnergyYearMonthData(calanderizedMeters);
        this.setEnergyMeters(calanderizedMeters, dateRange);
        this.setTotalEnergyUsage();
        this.setTotalEnergyCost();
        this.setTotalLocationEmissions();
        this.setTotalMarketEmissions();
        //costs
        this.setAllSourcesYearMonthData(calanderizedMeters);
        this.setCostMeters(calanderizedMeters, dateRange);
        this.setTotalAccountCost();
        //water
        let hasWater: CalanderizedMeter = calanderizedMeters.find(cMeter => { return WaterSources.includes(cMeter.meter.source) })
        if (hasWater) {
            this.setWaterMeters(calanderizedMeters, dateRange);
            this.setTotalWaterConsumption();
            this.setTotalWaterCost();
            this.setWaterYearMonthData(calanderizedMeters);
        }

        this.setAnnualSourceData(calanderizedMeters, facility);
    }

    setEnergyYearMonthData(calanderizedMeters: Array<CalanderizedMeter>) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return EnergySources.includes(cMeter.meter.source);
        });
        this.energyYearMonthData = getYearlyUsageNumbers(sourceMeters);
    }

    setAllSourcesYearMonthData(calanderizedMeters: Array<CalanderizedMeter>) {
        this.allSourcesYearMonthData = getYearlyUsageNumbers(calanderizedMeters);
    }

    setWaterYearMonthData(calanderizedMeters: Array<CalanderizedMeter>) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return WaterSources.includes(cMeter.meter.source);
        });
        this.waterYearMonthData = getYearlyUsageNumbers(sourceMeters);
        console.log(this.waterYearMonthData);
    }

    //energy
    setEnergyMeters(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return EnergySources.includes(cMeter.meter.source);
        });
        this.energyMeters = new Array();
        sourceMeters.forEach(cMeter => {
            let facilityOverview: FacilityOverviewMeter = new FacilityOverviewMeter(cMeter, dateRange, 'energy');
            this.energyMeters.push(facilityOverview);
        });
    }

    setTotalEnergyUsage() {
        this.totalEnergyUsage = _.sumBy(this.energyMeters, 'totalUsage');
    }

    setTotalEnergyCost() {
        this.totalEnergyCost = _.sumBy(this.energyMeters, 'totalCost');
        if (isNaN(this.totalEnergyCost)) {
            this.totalEnergyCost = 0;
        }
    }

    setTotalLocationEmissions() {
        this.totalLocationEmissions = _.sumBy(this.energyMeters, 'totalLocationEmissions');
    }

    setTotalMarketEmissions() {
        this.totalMarketEmissions = _.sumBy(this.energyMeters, 'totalMarketEmissions');
    }


    //costs
    setCostMeters(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.costMeters = new Array();
        calanderizedMeters.forEach(cMeter => {
            let facilityOverview: FacilityOverviewMeter = new FacilityOverviewMeter(cMeter, dateRange, 'cost');
            this.costMeters.push(facilityOverview);
        });
    }

    setTotalAccountCost() {
        this.totalFacilityCost = _.sumBy(this.costMeters, 'totalCost');
        if (isNaN(this.totalFacilityCost)) {
            this.totalFacilityCost = 0;
        }
    }

    //water
    setWaterMeters(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return WaterSources.includes(cMeter.meter.source);
        });
        this.waterMeters = new Array();
        sourceMeters.forEach(cMeter => {
            let facilityOverview: FacilityOverviewMeter = new FacilityOverviewMeter(cMeter, dateRange, 'water');
            this.waterMeters.push(facilityOverview);
        });
    }

    setTotalWaterConsumption() {
        this.totalWaterConsumption = _.sumBy(this.waterMeters, 'totalUsage');
    }

    setTotalWaterCost() {
        this.totalWaterCost = _.sumBy(this.waterMeters, 'totalCost');
        if (isNaN(this.totalWaterCost)) {
            this.totalWaterCost = 0;
        }
    }


    //Annual source data
    setAnnualSourceData(calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility) {
        this.annualSourceData = new Array();
        AllSources.forEach(source => {
            let sourceData: AnnualSourceData = new AnnualSourceData(calanderizedMeters, source, facility);
            this.annualSourceData.push(sourceData);
        });
    }

}


export class FacilityOverviewMeter {

    monthlyData: Array<MonthlyData>;
    totalUsage: number;
    totalCost: number;
    totalMarketEmissions: number;
    totalLocationEmissions: number;
    groupName: string;
    meter: IdbUtilityMeter;

    constructor(cMeter: CalanderizedMeter, dateRange: { startDate: Date, endDate: Date }, dataType: 'energy' | 'cost' | 'water') {
        this.meter = cMeter.meter;
        this.setMonthlyData(cMeter.monthlyData, new Date(dateRange.startDate), new Date(dateRange.endDate));
        this.setTotalUsage(dataType);
        this.setTotalCost();
        if (dataType == 'energy') {
            this.setTotalEmissions();
        }
    }

    setMonthlyData(allMonthlyData: Array<MonthlyData>, startDate: Date, endDate: Date) {
        this.monthlyData = allMonthlyData.filter(monthlyData => {
            let itemDate: Date = new Date(monthlyData.date);
            if (itemDate >= startDate && itemDate <= endDate) {
                return monthlyData;
            }
        });
    }

    setTotalUsage(dataType: 'energy' | 'cost' | 'water') {
        if (dataType == 'energy') {
            this.totalUsage = _.sumBy(this.monthlyData, 'energyUse');
        } else if (dataType == 'water') {
            this.totalUsage = _.sumBy(this.monthlyData, 'energyConsumption');
        }
    }

    setTotalCost() {
        this.totalCost = _.sumBy(this.monthlyData, 'energyCost');
        if (isNaN(this.totalCost)) {
            this.totalCost = 0;
        }
    }

    setTotalEmissions() {
        this.totalMarketEmissions = _.sumBy(this.monthlyData, 'marketEmissions');
        this.totalLocationEmissions = _.sumBy(this.monthlyData, 'locationEmissions');
    }


}


export class AnnualSourceData {

    source: MeterSource;
    annualSourceDataItems: Array<AnnualSourceDataItem>;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, source: MeterSource, facilityOrAccount: IdbFacility | IdbAccount) {
        this.source = source;
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == source;
        });
        let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(scMeter => {
            return scMeter.monthlyData;
        });
        let years: Array<number> = monthlyData.flatMap(mData => {
            return getFiscalYear(mData.date, facilityOrAccount);
        });
        years = _.uniq(years);
        this.annualSourceDataItems = new Array();
        years.forEach(year => {
            let dataItem: AnnualSourceDataItem = new AnnualSourceDataItem(monthlyData, year, facilityOrAccount)
            this.annualSourceDataItems.push(dataItem);
        });

    }
}


export class AnnualSourceDataItem {

    fiscalYear: number;
    totalEnergyUsage: number;
    totalConsumption: number;
    totalCost: number;
    totalMarketEmissions: number;
    totalLocationEmissions: number;

    constructor(monthlyData: Array<MonthlyData>, fiscalYear: number, facilityOrAccount: IdbFacility | IdbAccount) {
        this.fiscalYear = fiscalYear;
        let fiscalYearMonthlyData: Array<MonthlyData> = monthlyData.filter(mData => {
            return getFiscalYear(mData.date, facilityOrAccount) == fiscalYear;
        });
        this.setTotalEnergyUsage(fiscalYearMonthlyData);
        this.setTotalConsumption(fiscalYearMonthlyData);
        this.setCost(fiscalYearMonthlyData);
        this.setTotalMarketEmissions(fiscalYearMonthlyData);
        this.setTotalLocationEmissions(fiscalYearMonthlyData);
    }

    setTotalEnergyUsage(fiscalYearMonthlyData: Array<MonthlyData>) {
        this.totalEnergyUsage = _.sumBy(fiscalYearMonthlyData, 'energyUse');
    }
    setTotalConsumption(fiscalYearMonthlyData: Array<MonthlyData>) {
        this.totalConsumption = _.sumBy(fiscalYearMonthlyData, 'energyConsumption');
    }
    setCost(fiscalYearMonthlyData: Array<MonthlyData>) {
        this.totalCost = _.sumBy(fiscalYearMonthlyData, 'energyCost');
    }
    setTotalMarketEmissions(fiscalYearMonthlyData: Array<MonthlyData>) {
        this.totalMarketEmissions = _.sumBy(fiscalYearMonthlyData, 'marketEmissions');
    }
    setTotalLocationEmissions(fiscalYearMonthlyData: Array<MonthlyData>) {
        this.totalLocationEmissions = _.sumBy(fiscalYearMonthlyData, 'locationEmissions');
    }
}