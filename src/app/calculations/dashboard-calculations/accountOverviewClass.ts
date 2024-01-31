import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility } from "src/app/models/idb";
import * as _ from 'lodash';
import { YearMonthData } from "src/app/models/dashboard";
import { getYearlyUsageNumbers } from "../shared-calculations/calanderizationFunctions";
import { EnergySources, WaterSources } from "src/app/models/constantsAndTypes";
import { EmissionsResults } from "src/app/models/eGridEmissions";
import { getEmissionsTotalsFromMonthlyData } from "../shared-calculations/calculationsHelpers";
import { SourceTotals } from "./sourceTotalsClass";
import { WaterDischargeColors, WaterIntakeColors } from "src/app/shared/utilityColors";

export class AccountOverviewData {

    energyYearMonthData: Array<YearMonthData>;
    waterYearMonthData: Array<YearMonthData>;
    allSourcesYearMonthData: Array<YearMonthData>;

    facilitiesEnergy: Array<AccountOverviewFacility>;
    totalEnergyUsage: number;
    totalEnergyCost: number;
    emissionsTotals: EmissionsResults;

    facilitiesCost: Array<AccountOverviewFacility>;
    totalAccountCost: number;

    facilitiesWater: Array<AccountOverviewFacility>;
    waterTypeData: Array<WaterTypeData>;
    totalWaterConsumption: number;
    totalWaterCost: number;
    calanderizedMeters: Array<CalanderizedMeter>;
    numberOfMeters: number;


    sourceTotals: SourceTotals;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facilities: Array<IdbFacility>, account: IdbAccount, dateRange: { startDate: Date, endDate: Date }) {
        this.calanderizedMeters = calanderizedMeters;
        this.numberOfMeters = this.calanderizedMeters?.length;
        //energy
        this.setEnergyYearMonthData(calanderizedMeters);
        this.setEnergyFacilities(calanderizedMeters, facilities, dateRange);
        this.setTotalEnergyUsage();
        this.setTotalEnergyCost();
        //costs
        this.setAllSourcesYearMonthData(calanderizedMeters);
        this.setCostFacilities(calanderizedMeters, facilities, dateRange);
        this.setTotalAccountCost();
        this.setTotalEmissions();
        //water
        let hasWater: CalanderizedMeter = calanderizedMeters.find(cMeter => { return WaterSources.includes(cMeter.meter.source) })
        if (hasWater) {
            this.setWaterFacilities(calanderizedMeters, facilities, dateRange);
            this.setTotalWaterConsumption();
            this.setTotalWaterCost();
            this.setWaterYearMonthData(calanderizedMeters);
            this.setWaterTypeData(calanderizedMeters, dateRange);
        }

        this.sourceTotals = new SourceTotals(calanderizedMeters, dateRange);
    }

    setEnergyYearMonthData(calanderizedMeters: Array<CalanderizedMeter>) {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return EnergySources.includes(cMeter.meter.source);
        });
        sourceMeters.forEach(cMeter => {
            if (cMeter.meter.includeInEnergy == false) {
                cMeter.monthlyData.forEach(monthlyData => {
                    monthlyData.energyUse = 0;
                    monthlyData.energyConsumption = 0;
                });
            }
        })
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
        this.totalEnergyUsage = _.sumBy(this.facilitiesEnergy, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.totalUsage });
    }

    setTotalEnergyCost() {
        this.totalEnergyCost = _.sumBy(this.facilitiesEnergy, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.totalCost });
        if (isNaN(this.totalEnergyCost)) {
            this.totalEnergyCost = 0;
        }
    }

    setTotalEmissions() {
        this.emissionsTotals = {
            RECs: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.RECs }),
            locationElectricityEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.locationElectricityEmissions }),
            marketElectricityEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.marketElectricityEmissions }),
            otherScope2Emissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.otherScope2Emissions }),
            scope2LocationEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.scope2LocationEmissions }),
            scope2MarketEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.scope2MarketEmissions }),
            excessRECs: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.excessRECs }),
            excessRECsEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.excessRECsEmissions }),
            mobileCarbonEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.mobileCarbonEmissions }),
            mobileBiogenicEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.mobileBiogenicEmissions }),
            mobileOtherEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.mobileOtherEmissions }),
            mobileTotalEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.mobileTotalEmissions }),
            fugitiveEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.fugitiveEmissions }),
            processEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.processEmissions }),
            stationaryEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.stationaryEmissions }),
            totalScope1Emissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.totalScope1Emissions }),
            totalWithMarketEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.totalWithMarketEmissions }),
            totalWithLocationEmissions: _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.emissions.totalWithLocationEmissions }),
        }
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
        this.totalAccountCost = _.sumBy(this.facilitiesCost, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.totalCost });
        if (isNaN(this.totalAccountCost)) {
            this.totalAccountCost = 0;
        }
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
        this.totalWaterConsumption = _.sumBy(this.facilitiesWater, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.totalUsage });
    }

    setTotalWaterCost() {
        this.totalWaterCost = _.sumBy(this.facilitiesWater, (overviewFacility: AccountOverviewFacility) => { return overviewFacility.totalCost });
        if (isNaN(this.totalWaterCost)) {
            this.totalWaterCost = 0;
        }
    }

    setWaterTypeData(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.waterTypeData = new Array();
        let waterIntakeMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == 'Water Intake';
        })
        let waterIntakeTypes: Array<string> = waterIntakeMeters.flatMap(cMeter => {
            return cMeter.meter.waterIntakeType;
        });
        waterIntakeTypes = _.uniq(waterIntakeTypes);
        waterIntakeTypes.forEach((type, index) => {
            let waterTypeData: WaterTypeData = new WaterTypeData(type, waterIntakeMeters, dateRange, true, WaterIntakeColors[index]);
            this.waterTypeData.push(waterTypeData)
        });
        let waterDischargeMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == 'Water Discharge';
        })
        let waterDischargeTypes: Array<string> = waterDischargeMeters.flatMap(cMeter => {
            return cMeter.meter.waterDischargeType;
        });
        waterDischargeTypes = _.uniq(waterDischargeTypes);
        waterDischargeTypes.forEach((type, index) => {
            let waterTypeData: WaterTypeData = new WaterTypeData(type, waterDischargeMeters, dateRange, false, WaterDischargeColors[index]);
            this.waterTypeData.push(waterTypeData)
        });
    }
}


export class AccountOverviewFacility {

    monthlyData: Array<MonthlyData>;
    totalUsage: number;
    totalCost: number;
    emissions: EmissionsResults;
    facility: IdbFacility;
    numberOfMeters: number;
    waterTypeData: Array<WaterTypeData>;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, facility: IdbFacility, dateRange: { startDate: Date, endDate: Date }, dataType: 'energy' | 'cost' | 'water') {
        this.facility = facility;
        let facilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid });
        this.numberOfMeters = facilityMeters.length;
        this.setMonthlyData(facilityMeters, new Date(dateRange.startDate), new Date(dateRange.endDate));
        this.setTotalUsage(dataType);
        this.setTotalCost();
        this.setTotalEmissions();
        if (dataType == 'water') {
            this.setWaterTypeData(facilityMeters, dateRange);
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
            this.totalUsage = _.sumBy(this.monthlyData, (mData: MonthlyData) => { return mData.energyUse });
        } else if (dataType == 'water') {
            this.totalUsage = _.sumBy(this.monthlyData, (mData: MonthlyData) => { return mData.energyConsumption });
        }
    }

    setTotalCost() {
        this.totalCost = _.sumBy(this.monthlyData, (mData: MonthlyData) => { return mData.energyCost });
        if (isNaN(this.totalCost)) {
            this.totalCost = 0;
        }
    }

    setTotalEmissions() {
        this.emissions = getEmissionsTotalsFromMonthlyData(this.monthlyData);
    }

    setWaterTypeData(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.waterTypeData = new Array();
        let waterIntakeMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == 'Water Intake';
        })
        let waterIntakeTypes: Array<string> = waterIntakeMeters.flatMap(cMeter => {
            return cMeter.meter.waterIntakeType;
        });
        waterIntakeTypes = _.uniq(waterIntakeTypes);
        waterIntakeTypes.forEach(type => {
            let waterTypeData: WaterTypeData = new WaterTypeData(type, waterIntakeMeters, dateRange, true, undefined);
            this.waterTypeData.push(waterTypeData)
        });
        let waterDischargeMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == 'Water Discharge';
        })
        let waterDischargeTypes: Array<string> = waterDischargeMeters.flatMap(cMeter => {
            return cMeter.meter.waterDischargeType;
        });
        waterDischargeTypes = _.uniq(waterDischargeTypes);
        waterDischargeTypes.forEach(type => {
            let waterTypeData: WaterTypeData = new WaterTypeData(type, waterDischargeMeters, dateRange, false, undefined);
            this.waterTypeData.push(waterTypeData)
        });
    }
}

export class WaterTypeData {

    monthlyData: Array<MonthlyData>;
    waterType: string;
    totalConsumption: number;
    totalCost: number;
    isIntake: boolean;
    color: string;
    constructor(waterType: string, calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }, isIntake: boolean, color: string) {
        this.color = color;
        this.isIntake = isIntake;
        this.waterType = waterType;
        this.setMonthlyData(waterType, calanderizedMeters, dateRange.startDate, dateRange.endDate);
        this.setTotalUsage();
        this.setTotalCost();
    }

    setMonthlyData(waterType: string, calanderizedMeters: Array<CalanderizedMeter>, startDate: Date, endDate: Date) {
        let waterTypeMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.waterIntakeType == waterType || cMeter.meter.waterDischargeType == waterType;
        });
        let allMonthlyData: Array<MonthlyData> = waterTypeMeters.flatMap(cMeter => { return cMeter.monthlyData });
        this.monthlyData = allMonthlyData.filter(monthlyData => {
            let itemDate: Date = new Date(monthlyData.date);
            if (itemDate >= startDate && itemDate <= endDate) {
                return monthlyData;
            }
        });
    }

    setTotalUsage() {
        this.totalConsumption = _.sumBy(this.monthlyData, (mData: MonthlyData) => { return mData.energyConsumption });
    }

    setTotalCost() {
        this.totalCost = _.sumBy(this.monthlyData, (mData: MonthlyData) => { return mData.energyCost });
        if (isNaN(this.totalCost)) {
            this.totalCost = 0;
        }
    }
}