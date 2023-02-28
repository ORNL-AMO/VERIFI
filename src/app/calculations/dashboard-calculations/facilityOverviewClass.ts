import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { YearMonthData } from "src/app/models/dashboard";
import { EnergySources, IdbUtilityMeter, WaterSources } from "src/app/models/idb";
import { getYearlyUsageNumbers } from "../shared-calculations/calanderizationFunctions";
import * as _ from 'lodash';

export class FacilityOverviewData {

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
    constructor(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
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
        this.energyYearMonthData = getYearlyUsageNumbers(sourceMeters);

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
            let facilityOverview: FacilityOverviewMeter = new FacilityOverviewMeter(cMeter,dateRange, 'water');
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