import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { EnergySources, MeterSource } from "src/app/models/idb";
import * as _ from 'lodash';

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
    //other sources: "Other Utility"
    // otherUtilityUseAndCost: Array<UseAndCost>;
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
        let water: UseAndCost = new UseAndCost(calanderizedMeters, 'Water', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (water.hasData()) {
            this.waterUseAndCost.push(water);
        }
        let wasteWater: UseAndCost = new UseAndCost(calanderizedMeters, 'Waste Water', dateRange.startDate, dateRange.endDate, this.previousYear);
        if (wasteWater.hasData()) {
            this.waterUseAndCost.push(wasteWater);
        }
    }

    // setOtherUseAndCost(calanderizedMeters: Array<CalanderizedMeter>, dateRange: { startDate: Date, endDate: Date }) {
    //     this.otherUtilityUseAndCost = new Array();
    //     let otherUtility: UseAndCost = new UseAndCost(calanderizedMeters, 'Other Utility', dateRange.startDate, dateRange.endDate, this.previousYear);
    //     if (otherUtility.hasData()) {
    //         this.otherUtilityUseAndCost.push(otherUtility);
    //     }
    // }


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

    setAllSourcesUseAndCost() {
        this.allSourcesUseAndCost = new Array();
        this.energyUseAndCost.forEach(useAndCost => {
            this.allSourcesUseAndCost.push(useAndCost);
        });
        this.waterUseAndCost.forEach(useAndCost => {
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
        return {
            end: {
                energyUse: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.energyUse }),
                energyUseChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.energyUseChange }),
                marketEmissions: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.marketEmissions }),
                marketEmissionsChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.marketEmissionsChange }),
                locationEmissions: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.locationEmissions }),
                locationEmissionsChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.locationEmissionsChange }),
                cost: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.cost }),
                costChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.end.costChange })
            },
            average: {
                energyUse: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.energyUse }),
                energyUseChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.energyUseChange }),
                marketEmissions: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.marketEmissions }),
                marketEmissionsChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.marketEmissionsChange }),
                locationEmissions: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.locationEmissions }),
                locationEmissionsChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.locationEmissionsChange }),
                cost: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.cost }),
                costChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.average.costChange })
            },
            previousYear: {
                energyUse: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.energyUse }),
                energyUseChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.energyUseChange }),
                marketEmissions: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.marketEmissions }),
                marketEmissionsChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.marketEmissionsChange }),
                locationEmissions: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.locationEmissions }),
                locationEmissionsChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.locationEmissionsChange }),
                cost: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.cost }),
                costChange: _.sumBy(useAndCostArr, (useAndCost: UseAndCost) => { return useAndCost.previousYear.costChange })
            }
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
        let totalMarketEmissions: number = 0;
        let totalLocationEmissions: number = 0;
        if (isEnergy) {
            totalMarketEmissions = _.sumBy(dataInRange, 'marketEmissions');
            totalLocationEmissions = _.sumBy(dataInRange, 'locationEmissions');
        }
        let totalCost: number = _.sumBy(dataInRange, 'energyCost')
        if (isNaN(totalCost)) {
            totalCost = 0;
        }

        this.average = {
            energyUse: totalEnergyUse / numberOfMonths,
            energyUseChange: 0,
            marketEmissions: totalMarketEmissions / numberOfMonths,
            marketEmissionsChange: 0,
            locationEmissions: totalLocationEmissions / numberOfMonths,
            locationEmissionsChange: 0,
            cost: totalCost / numberOfMonths,
            costChange: 0
        }
    }

    setAverageChangeValues() {
        this.average.costChange = (this.average.cost - this.end.cost);
        this.average.energyUseChange = (this.average.energyUse - this.end.energyUse);
        this.average.marketEmissionsChange = (this.average.marketEmissions - this.end.marketEmissions);
        this.average.locationEmissionsChange = (this.average.locationEmissions - this.end.locationEmissions);
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
                let marketEmissions: number = 0;
                let locationEmissions: number = 0;
                if (isEnergy) {
                    marketEmissions = _.sumBy(selectedDateData, 'marketEmissions');
                    locationEmissions = _.sumBy(selectedDateData, 'locationEmissions');
                }
                let cost: number = _.sumBy(selectedDateData, 'energyCost')
                if (isNaN(cost)) {
                    cost = 0;
                }
                return {
                    energyUse: energyUse,
                    energyUseChange: 0,
                    marketEmissions: marketEmissions,
                    marketEmissionsChange: 0,
                    locationEmissions: locationEmissions,
                    locationEmissionsChange: 0,
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
        cost: 0,
        costChange: 0
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

export interface IUseAndCost {
    energyUse: number,
    energyUseChange: number,
    marketEmissions: number,
    marketEmissionsChange: number,
    locationEmissions: number,
    locationEmissionsChange: number,
    cost: number,
    costChange: number
};