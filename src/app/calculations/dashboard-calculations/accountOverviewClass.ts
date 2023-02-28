import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { EnergySources, IdbAccount, IdbFacility, MeterSource, WaterSources } from "src/app/models/idb";
import * as _ from 'lodash';
import { YearMonthData } from "src/app/models/dashboard";
import { getYearlyUsageNumbers } from "../shared-calculations/calanderizationFunctions";

export class AccountOverviewData {

    energyYearMonthData: Array<YearMonthData>;
    waterYearMonthData: Array<YearMonthData>;
    allSourcesYearMonthData: Array<YearMonthData>;

    facilitiesEnergy: Array<AccountOverviewFacility>;
    totalEnergyUsage: number;
    totalEnergyCost: number;
    totalMarketEmissions: number;
    totalLocationEmissions: number;

    facilitiesCost: Array<AccountOverviewFacility>;
    numberOfMeters: number;
    totalAccountCost: number;

    facilitiesWater: Array<AccountOverviewFacility>;
    totalWaterConsumption: number;
    totalWaterCost: number;
    calanderizedMeters: Array<CalanderizedMeter>;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, account: IdbAccount, dateRange: { startDate: Date, endDate: Date }) {
        this.calanderizedMeters = calanderizedMeters;
        //energy
        this.setEnergyYearMonthData(calanderizedMeters);
        this.setEnergyFacilities(calanderizedMeters, facilities, dateRange);
        this.setTotalEnergyUsage();
        this.setTotalEnergyCost();
        this.setTotalLocationEmissions();
        this.setTotalMarketEmissions();
        //costs
        this.setAllSourcesYearMonthData(calanderizedMeters);
        this.setCostFacilities(calanderizedMeters, facilities, dateRange);
        this.setTotalAccountCost();
        //water
        let hasWater: CalanderizedMeter = calanderizedMeters.find(cMeter => { return WaterSources.includes(cMeter.meter.source) })
        if (hasWater) {
            this.setWaterFacilities(calanderizedMeters, facilities, dateRange);
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
    setEnergyFacilities(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, dateRange: { startDate: Date, endDate: Date }) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return EnergySources.includes(cMeter.meter.source);
        });
        this.facilitiesEnergy = new Array();
        facilities.forEach(facility => {
            let facilityOverview: AccountOverviewFacility = new AccountOverviewFacility(sourceMeters, facility, dateRange, 'energy');
            this.facilitiesEnergy.push(facilityOverview);
        });
    }

    setTotalEnergyUsage() {
        this.totalEnergyUsage = _.sumBy(this.facilitiesEnergy, 'totalUsage');
    }

    setTotalEnergyCost() {
        this.totalEnergyCost = _.sumBy(this.facilitiesEnergy, 'totalCost');
        if (isNaN(this.totalEnergyCost)) {
            this.totalEnergyCost = 0;
        }
    }

    setTotalLocationEmissions() {
        this.totalLocationEmissions = _.sumBy(this.facilitiesEnergy, 'totalLocationEmissions');
    }

    setTotalMarketEmissions() {
        this.totalMarketEmissions = _.sumBy(this.facilitiesEnergy, 'totalMarketEmissions');
    }


    //costs
    setCostFacilities(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, dateRange: { startDate: Date, endDate: Date }) {
        this.facilitiesCost = new Array();
        facilities.forEach(facility => {
            let facilityOverview: AccountOverviewFacility = new AccountOverviewFacility(calanderizedMeters, facility, dateRange, 'cost');
            this.facilitiesCost.push(facilityOverview);
        });
    }

    setTotalAccountCost() {
        this.totalAccountCost = _.sumBy(this.facilitiesCost, 'totalCost');
        if (isNaN(this.totalAccountCost)) {
            this.totalAccountCost = 0;
        }
    }

    setNumberOfMeters() {
        this.numberOfMeters = _.sumBy(this.facilitiesCost, 'numberOfMeters');
    }


    //water
    setWaterFacilities(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, dateRange: { startDate: Date, endDate: Date }) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return WaterSources.includes(cMeter.meter.source);
        });
        this.facilitiesWater = new Array();
        facilities.forEach(facility => {
            let facilityOverview: AccountOverviewFacility = new AccountOverviewFacility(sourceMeters, facility, dateRange, 'water');
            this.facilitiesWater.push(facilityOverview);
        });
    }

    setTotalWaterConsumption() {
        this.totalWaterConsumption = _.sumBy(this.facilitiesWater, 'totalUsage');
    }

    setTotalWaterCost() {
        this.totalWaterCost = _.sumBy(this.facilitiesWater, 'totalCost');
        if (isNaN(this.totalWaterCost)) {
            this.totalWaterCost = 0;
        }
    }
}


export class AccountOverviewFacility {

    monthlyData: Array<MonthlyData>;
    totalUsage: number;
    totalCost: number;
    totalMarketEmissions: number;
    totalLocationEmissions: number;
    facility: IdbFacility;
    numberOfMeters: number;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, dateRange: { startDate: Date, endDate: Date }, dataType: 'energy' | 'cost' | 'water') {
        this.facility = facility;
        let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
        this.numberOfMeters = facilityMeters.length;
        this.setMonthlyData(facilityMeters, new Date(dateRange.startDate), new Date(dateRange.endDate));
        this.setTotalUsage(dataType);
        this.setTotalCost();
        if (dataType == 'energy') {
            this.setTotalEmissions();
        }
    }

    setMonthlyData(calanderizedMeters: Array<CalanderizedMeter>, startDate: Date, endDate: Date) {
        let allMonthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => { return cMeter.monthlyData });
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

