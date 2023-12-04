import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { EnergySources, MeterSource } from "src/app/models/constantsAndTypes";
import { EmissionsResults } from "src/app/models/eGridEmissions";
import { getEmissionsTotalsFromMonthlyData } from "../shared-calculations/calculationsHelpers";

export class UtilityUseAndCost {

    //energy/emissions sources: "Electricity", "Natural Gas", "Other Fuels", "Other Energy"
    // electricity: UseAndCost;
    // naturalGas: UseAndCost;
    // otherFuels: UseAndCost;
    // otherEnergy: UseAndCost;
    energyUseAndCost: Array<UseAndCost>;
    energyTotal: {
        end: IUseAndCost;
        average: IUseAndCost;
        previousYear: IUseAndCost;
    };
    //water sources: "Water", "Waste Water"
    // water: UseAndCost;
    // wasteWater: UseAndCost;
    waterUseAndCost: Array<UseAndCost>;
    waterTotal: {
        end: IUseAndCost;
        average: IUseAndCost;
        previousYear: IUseAndCost;
    };
    //other sources: "Other"
    otherUtilityUseAndCost: Array<UseAndCost>;
    otherTotal: {
        end: IUseAndCost;
        average: IUseAndCost;
        previousYear: IUseAndCost;
    }
    allSourcesUseAndCost: Array<UseAndCost>;
    allSourcesTotal: {
        end: IUseAndCost;
        average: IUseAndCost;
        previousYear: IUseAndCost;
    };

    previousYear: Date;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.setPreviousYear(dateRange.endDate);
        this.setEnergyUseAndCost(calanderizedMeters, dateRange);
        this.setEnergyTotal();
        this.setWaterUseAndCost(calanderizedMeters, dateRange);
        this.setWaterTotal();
        this.setOtherUseAndCost(calanderizedMeters, dateRange);
        this.setOtherTotal();
        this.setAllSourcesUseAndCost();
        this.setAllSourcesTotal();
    }

    setPreviousYear(endDate: Date) {
        let date: Date = new Date(endDate)
        this.previousYear = new Date(date.getFullYear() - 1, date.getMonth(), 1);
    }

    setEnergyUseAndCost(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.energyUseAndCost = new Array();
        let electricity: UseAndCost = new UseAndCost(calanderizedMeters, 'Electricity', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (electricity.hasData()) {
            this.energyUseAndCost.push(electricity);
        }
        let naturalGas: UseAndCost = new UseAndCost(calanderizedMeters, 'Natural Gas', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (naturalGas.hasData()) {
            this.energyUseAndCost.push(naturalGas);
        }
        let otherFuels: UseAndCost = new UseAndCost(calanderizedMeters, 'Other Fuels', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (otherFuels.hasData()) {
            this.energyUseAndCost.push(otherFuels);
        }
        let otherEnergy: UseAndCost = new UseAndCost(calanderizedMeters, 'Other Energy', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (otherEnergy.hasData()) {
            this.energyUseAndCost.push(otherEnergy);
        }
    }

    setWaterUseAndCost(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.waterUseAndCost = new Array();
        let water: UseAndCost = new UseAndCost(calanderizedMeters, 'Water Intake', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (water.hasData()) {
            this.waterUseAndCost.push(water);
        }
        let wasteWater: UseAndCost = new UseAndCost(calanderizedMeters, 'Water Discharge', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (wasteWater.hasData()) {
            this.waterUseAndCost.push(wasteWater);
        }
    }

    setOtherUseAndCost(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
        this.otherUtilityUseAndCost = new Array();
        let otherUtility: UseAndCost = new UseAndCost(calanderizedMeters, 'Other', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (otherUtility.hasData()) {
            this.otherUtilityUseAndCost.push(otherUtility);
        }
    }


    setEnergyTotal() {
        if (this.energyUseAndCost.length != 0) {
            this.energyTotal = this.getTotal(this.energyUseAndCost);
        } else {
            this.energyTotal = this.getEmptyTotal();
        }
    }

    setWaterTotal() {
        if (this.waterUseAndCost.length != 0) {
            this.waterTotal = this.getTotal(this.waterUseAndCost);
        } else {
            this.waterTotal = this.getEmptyTotal();
        }
    }

    setOtherTotal() {
        if (this.otherUtilityUseAndCost.length != 0) {
            this.otherTotal = this.getTotal(this.otherUtilityUseAndCost);
        } else {
            this.otherTotal = this.getEmptyTotal();
        }
    }

    setAllSourcesUseAndCost() {
        this.allSourcesUseAndCost = new Array();
        this.energyUseAndCost.forEach(useAndCost => {
            this.allSourcesUseAndCost.push(useAndCost);
        });
        this.waterUseAndCost.forEach(useAndCost => {
            this.allSourcesUseAndCost.push(useAndCost);
        });
        this.otherUtilityUseAndCost.forEach(useAndCost => {
            this.allSourcesUseAndCost.push(useAndCost);
        });
    }

    setAllSourcesTotal() {
        if (this.allSourcesUseAndCost.length != 0) {
            this.allSourcesTotal = this.getTotal(this.allSourcesUseAndCost);
        }
        else {
            this.allSourcesTotal = this.getEmptyTotal();
        }
    }

    getTotal(useAndCostArr: Array<UseAndCost>): {
        end: IUseAndCost;
        average: IUseAndCost
        previousYear: IUseAndCost;
    } {
        let endData: Array<IUseAndCost> = useAndCostArr.flatMap(data => { return data.end });
        let averageData: Array<IUseAndCost> = useAndCostArr.flatMap(data => { return data.average });
        let previousYear: Array<IUseAndCost> = useAndCostArr.flatMap(data => { return data.previousYear });
        return {
            end: this.getUseAndCostTotals(endData),
            average: this.getUseAndCostTotals(averageData),
            previousYear: this.getUseAndCostTotals(previousYear)
        }
    }

    getEmptyTotal(): {
        end: IUseAndCost;
        average: IUseAndCost
        previousYear: IUseAndCost;
    } {
        return {
            end: getEmptyIUseAnCost(),
            average: getEmptyIUseAnCost(),
            previousYear: getEmptyIUseAnCost()
        }
    }

    getUseAndCostTotals(allData: Array<IUseAndCost>): IUseAndCost {
        return {
            energyUse: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.energyUse }),
            energyUseChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.energyUseChange }),
            marketEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.marketEmissions }),
            marketEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.marketEmissionsChange }),
            locationEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.locationEmissions }),
            locationEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.locationEmissionsChange }),
            RECsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.RECsChange }),
            RECs: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.RECs }),
            excessRECsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.excessRECsChange }),
            excessRECs: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.excessRECs }),
            excessRECsEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.excessRECsEmissionsChange }),
            excessRECsEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.excessRECsEmissions }),
            mobileCarbonEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileCarbonEmissionsChange }),
            mobileCarbonEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileCarbonEmissions }),
            mobileBiogenicEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileBiogenicEmissionsChange }),
            mobileBiogenicEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileBiogenicEmissions }),
            mobileOtherEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileOtherEmissionsChange }),
            mobileOtherEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileOtherEmissions }),
            mobileTotalEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileTotalEmissionsChange }),
            mobileTotalEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.mobileTotalEmissions }),
            fugitiveEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.fugitiveEmissionsChange }),
            fugitiveEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.fugitiveEmissions }),
            processEmissionsChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.processEmissionsChange }),
            processEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.processEmissions }),
            totalWithLocationEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.totalWithLocationEmissions }),
            totalEmissionsWithLocationChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.totalEmissionsWithLocationChange }),
            totalWithMarketEmissions: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.totalWithMarketEmissions }),
            totalEmissionsWithMarketChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.totalEmissionsWithMarketChange }),
            cost: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.cost }),
            costChange: _.sumBy(allData, (useAndCost: IUseAndCost) => { return useAndCost.costChange })
        }
    }
}

export class UseAndCost {

    source: MeterSource;

    average: IUseAndCost;

    end: IUseAndCost
    previousYear: IUseAndCost;

    constructor(calanderizedMeters: Array<CalanderizedMeter>, source: MeterSource, startDate: Date, endDate: Date, previousYear: Date) {
        this.source = source;
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => {
            return cMeter.meter.source == source
        });
        let monthlyData: Array<MonthlyData> = sourceMeters.flatMap(cMeter => {
            return cMeter.monthlyData;
        });
        let isEnergy: boolean = EnergySources.includes(source);
        this.setEnd(monthlyData, endDate, isEnergy);
        this.setPreviousYear(monthlyData, previousYear, isEnergy);
        this.setPreviousYearChangeValues();
        this.setAverage(monthlyData, startDate, endDate, isEnergy);
        this.setAverageChangeValues();

    }


    setEnd(monthlyData: Array<MonthlyData>, endDate: Date, isEnergy: boolean) {
        this.end = this.getDateIUseAndCostValues(endDate, monthlyData, isEnergy);
    }

    setPreviousYear(monthlyData: Array<MonthlyData>, previousYear: Date, isEnergy: boolean) {
        this.previousYear = this.getDateIUseAndCostValues(previousYear, monthlyData, isEnergy);
    }

    setPreviousYearChangeValues() {
        this.previousYear.costChange = (this.previousYear.cost - this.end.cost);
        this.previousYear.energyUseChange = (this.previousYear.energyUse - this.end.energyUse);
        this.previousYear.marketEmissionsChange = (this.previousYear.marketEmissions - this.end.marketEmissions);
        this.previousYear.locationEmissionsChange = (this.previousYear.locationEmissions - this.end.locationEmissions);

        this.previousYear.excessRECsChange = (this.previousYear.excessRECs - this.end.excessRECs);
        this.previousYear.excessRECsEmissionsChange = (this.previousYear.excessRECsEmissions - this.end.excessRECsEmissions);
        this.previousYear.mobileCarbonEmissionsChange = (this.previousYear.mobileCarbonEmissions - this.end.mobileCarbonEmissions);
        this.previousYear.mobileBiogenicEmissionsChange = (this.previousYear.mobileBiogenicEmissions - this.end.mobileBiogenicEmissions);
        this.previousYear.mobileOtherEmissionsChange = (this.previousYear.mobileOtherEmissions - this.end.mobileOtherEmissions);
        this.previousYear.mobileTotalEmissionsChange = (this.previousYear.mobileTotalEmissions - this.end.mobileTotalEmissions);
        this.previousYear.fugitiveEmissionsChange = (this.previousYear.fugitiveEmissions - this.end.fugitiveEmissions);
        this.previousYear.processEmissionsChange = (this.previousYear.processEmissions - this.end.processEmissions);
        this.previousYear.totalEmissionsWithLocationChange = (this.previousYear.totalWithLocationEmissions - this.end.totalWithLocationEmissions);
        this.previousYear.totalEmissionsWithMarketChange = (this.previousYear.totalWithMarketEmissions - this.end.totalWithMarketEmissions);
    }

    setAverage(monthlyData: Array<MonthlyData>, startDate: Date, endDate: Date, isEnergy: boolean) {
        let dataInRange: Array<MonthlyData> = monthlyData.filter(mData => {
            let dataDate: Date = new Date(mData.date);
            return (dataDate >= startDate) && (dataDate <= endDate);
        });
        let numberOfMonths: number = getNumberOfMonths(startDate, endDate);
        let totalEnergyUse: number = 0;
        if (isEnergy) {
            totalEnergyUse = _.sumBy(dataInRange, 'energyUse');
        } else {
            totalEnergyUse = _.sumBy(dataInRange, 'energyConsumption');
        }

        let emissionsTotals: EmissionsResults = getEmissionsTotalsFromMonthlyData(dataInRange);
        let totalCost: number = _.sumBy(dataInRange, 'energyCost')
        if (isNaN(totalCost)) {
            totalCost = 0;
        }

        this.average = {
            energyUse: totalEnergyUse / numberOfMonths,
            energyUseChange: 0,
            marketEmissions: emissionsTotals.marketEmissions / numberOfMonths,
            marketEmissionsChange: 0,
            locationEmissions: emissionsTotals.locationEmissions / numberOfMonths,
            locationEmissionsChange: 0,
            RECsChange: 0,
            RECs: emissionsTotals.RECs / numberOfMonths,
            excessRECsChange: 0,
            excessRECs: emissionsTotals.excessRECs / numberOfMonths,
            excessRECsEmissionsChange: 0,
            excessRECsEmissions: emissionsTotals.excessRECsEmissions / numberOfMonths,
            mobileCarbonEmissionsChange: 0,
            mobileCarbonEmissions: emissionsTotals.mobileCarbonEmissions / numberOfMonths,
            mobileBiogenicEmissionsChange: 0,
            mobileBiogenicEmissions: emissionsTotals.mobileBiogenicEmissions / numberOfMonths,
            mobileOtherEmissionsChange: 0,
            mobileOtherEmissions: emissionsTotals.mobileOtherEmissions / numberOfMonths,
            mobileTotalEmissionsChange: 0,
            mobileTotalEmissions: emissionsTotals.mobileTotalEmissions / numberOfMonths,
            fugitiveEmissionsChange: 0,
            fugitiveEmissions: emissionsTotals.fugitiveEmissions / numberOfMonths,
            processEmissionsChange: 0,
            processEmissions: emissionsTotals.processEmissions / numberOfMonths,
            totalWithLocationEmissions: emissionsTotals.totalWithLocationEmissions / numberOfMonths,
            totalEmissionsWithLocationChange: 0,
            totalWithMarketEmissions: emissionsTotals.totalWithMarketEmissions / numberOfMonths,
            totalEmissionsWithMarketChange: 0,
            cost: totalCost / numberOfMonths,
            costChange: 0
        }
    }

    setAverageChangeValues() {
        this.average.costChange = (this.average.cost - this.end.cost);
        this.average.energyUseChange = (this.average.energyUse - this.end.energyUse);
        this.average.marketEmissionsChange = (this.average.marketEmissions - this.end.marketEmissions);
        this.average.locationEmissionsChange = (this.average.locationEmissions - this.end.locationEmissions);

        this.average.excessRECsChange = (this.average.excessRECs - this.end.excessRECs);
        this.average.excessRECsEmissionsChange = (this.average.excessRECsEmissions - this.end.excessRECsEmissions);
        this.average.mobileCarbonEmissionsChange = (this.average.mobileCarbonEmissions - this.end.mobileCarbonEmissions);
        this.average.mobileBiogenicEmissionsChange = (this.average.mobileBiogenicEmissions - this.end.mobileBiogenicEmissions);
        this.average.mobileOtherEmissionsChange = (this.average.mobileOtherEmissions - this.end.mobileOtherEmissions);
        this.average.mobileTotalEmissionsChange = (this.average.mobileTotalEmissions - this.end.mobileTotalEmissions);
        this.average.fugitiveEmissionsChange = (this.average.fugitiveEmissions - this.end.fugitiveEmissions);
        this.average.processEmissionsChange = (this.average.processEmissions - this.end.processEmissions);
        this.average.totalEmissionsWithLocationChange = (this.average.totalWithLocationEmissions - this.end.totalWithLocationEmissions);
        this.average.totalEmissionsWithMarketChange = (this.average.totalWithMarketEmissions - this.end.totalWithMarketEmissions);
    }

    getDateIUseAndCostValues(date: Date, monthlyData: Array<MonthlyData>, isEnergy: boolean): IUseAndCost {
        if (monthlyData.length != 0) {
            let selectedDateData: Array<MonthlyData> = monthlyData.filter(mData => {
                let dataDate: Date = new Date(mData.date);
                return dataDate.getMonth() == date.getMonth() && dataDate.getFullYear() == date.getFullYear();
            });
            if (selectedDateData.length != 0) {
                let energyUse: number = 0;
                if (isEnergy) {
                    energyUse = _.sumBy(selectedDateData, 'energyUse');
                } else {
                    energyUse = _.sumBy(selectedDateData, 'energyConsumption');
                }
                let emissionsTotals: EmissionsResults = getEmissionsTotalsFromMonthlyData(selectedDateData);

                let cost: number = _.sumBy(selectedDateData, 'energyCost')
                if (isNaN(cost)) {
                    cost = 0;
                }
                return {
                    energyUse: energyUse,
                    energyUseChange: 0,
                    marketEmissions: emissionsTotals.marketEmissions,
                    marketEmissionsChange: 0,
                    locationEmissions: emissionsTotals.locationEmissions,
                    locationEmissionsChange: 0,
                    RECsChange: 0,
                    RECs: emissionsTotals.RECs,
                    excessRECsChange: 0,
                    excessRECs: emissionsTotals.excessRECs,
                    excessRECsEmissionsChange: 0,
                    excessRECsEmissions: emissionsTotals.excessRECsEmissions,
                    mobileCarbonEmissionsChange: 0,
                    mobileCarbonEmissions: emissionsTotals.mobileCarbonEmissions,
                    mobileBiogenicEmissionsChange: 0,
                    mobileBiogenicEmissions: emissionsTotals.mobileBiogenicEmissions,
                    mobileOtherEmissionsChange: 0,
                    mobileOtherEmissions: emissionsTotals.mobileOtherEmissions,
                    mobileTotalEmissionsChange: 0,
                    mobileTotalEmissions: emissionsTotals.mobileTotalEmissions,
                    fugitiveEmissionsChange: 0,
                    fugitiveEmissions: emissionsTotals.fugitiveEmissions,
                    processEmissionsChange: 0,
                    processEmissions: emissionsTotals.processEmissions,
                    totalWithLocationEmissions: emissionsTotals.totalWithLocationEmissions,
                    totalEmissionsWithLocationChange: 0,
                    totalWithMarketEmissions: emissionsTotals.totalWithMarketEmissions,
                    totalEmissionsWithMarketChange: 0,
                    cost: cost,
                    costChange: 0
                }
            }

        }
        return getEmptyIUseAnCost();
    }

    hasData(): boolean {
        return (this.average.cost != 0 || this.average.energyUse != 0 || this.end.energyUse != 0 || this.end.cost != 0 || this.previousYear.cost != 0 || this.previousYear.energyUse != 0);
    }
}

export function getEmptyIUseAnCost(): IUseAndCost {
    return {
        energyUse: 0,
        energyUseChange: 0,
        marketEmissions: 0,
        marketEmissionsChange: 0,
        locationEmissions: 0,
        locationEmissionsChange: 0,
        RECsChange: 0,
        RECs: 0,
        excessRECsChange: 0,
        excessRECs: 0,
        excessRECsEmissionsChange: 0,
        excessRECsEmissions: 0,
        mobileCarbonEmissionsChange: 0,
        mobileCarbonEmissions: 0,
        mobileBiogenicEmissionsChange: 0,
        mobileBiogenicEmissions: 0,
        mobileOtherEmissionsChange: 0,
        mobileOtherEmissions: 0,
        mobileTotalEmissionsChange: 0,
        mobileTotalEmissions: 0,
        fugitiveEmissionsChange: 0,
        fugitiveEmissions: 0,
        processEmissionsChange: 0,
        processEmissions: 0,
        cost: 0,
        costChange: 0,
        totalWithLocationEmissions: 0,
        totalEmissionsWithLocationChange: 0,
        totalWithMarketEmissions: 0,
        totalEmissionsWithMarketChange: 0
    }
}

export function getNumberOfMonths(date1: Date, date2: Date): number {
    let months: number = ((date2.getFullYear() - date1.getFullYear()) * 12) + 1;
    months -= date1.getMonth();
    months += date2.getMonth();
    if (months > 0) {
        return months;
    } else {
        return 0;
    }
}

export interface IUseAndCost extends EmissionsResults {
    energyUse: number,
    energyUseChange: number,

    marketEmissionsChange: number,
    locationEmissionsChange: number,
    RECsChange: number,
    excessRECsChange: number,
    excessRECsEmissionsChange: number,
    mobileCarbonEmissionsChange: number,
    mobileBiogenicEmissionsChange: number,
    mobileOtherEmissionsChange: number,
    mobileTotalEmissionsChange: number,
    fugitiveEmissionsChange: number,
    processEmissionsChange: number
    totalEmissionsWithMarketChange: number,
    totalEmissionsWithLocationChange: number,

    cost: number,
    costChange: number
};