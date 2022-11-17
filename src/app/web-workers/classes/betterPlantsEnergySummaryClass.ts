import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { MeterSource } from "src/app/models/idb";
import { BetterPlantsEnergySummary } from "src/app/models/overview-report";

export class BetterPlantsEnergySummaryClass {


    numberOfFacilities: number;
    electricityUse: number;
    naturalGasUse: number;
    distilateFuelUse: number;
    residualFuelUse: number;
    coalUse: number;
    cokeEnergyUse: number;
    blastFurnaceEnergyUse: number;
    woodWasteEnergyUse: number;
    otherGasFuels: Array<string>;
    otherGasUse: number;
    otherSolidFuels: Array<string>;
    otherSolidUse: number;
    otherLiquidFuels: Array<string>;
    otherLiquidUse: number;
    totalEnergyUse: number;
    constructor(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        this.setElectricityUse(calanderizedMeters, year);
        this.setNaturalGasUse(calanderizedMeters, year);
        this.setDistilateFuels(calanderizedMeters, year);
        this.setResidualFuels(calanderizedMeters, year);
        this.setCoalFuels(calanderizedMeters, year);
        this.setCokeFuels(calanderizedMeters, year);
        this.setWoodUse(calanderizedMeters, year);
        this.setBlastFurnaceUse(calanderizedMeters, year);
        this.setOtherGasFuelUse(calanderizedMeters, year);
        this.setOtherLiquidFuelUse(calanderizedMeters, year);
        this.setOtherSolidFuelUse(calanderizedMeters, year);
        this.setTotalEnergyUse();
        this.setNumberOfFacilities(calanderizedMeters, year);
    }

    setElectricityUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Electricity', undefined, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.electricityUse = _.sumBy(yearData, 'energyUse');
    }

    setNaturalGasUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Natural Gas', undefined, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.naturalGasUse = _.sumBy(yearData, 'energyUse');
    }

    setDistilateFuels(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let distilateFuels: Array<string> = ['Distillate Fuel Oil', 'Diesel', 'Fuel Oil #1', 'Fuel Oil #2', 'Fuel Oil #2'];
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', distilateFuels, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.distilateFuelUse = _.sumBy(yearData, 'energyUse');
    }

    setResidualFuels(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let residualFuels: Array<string> = ['Residual Fuel Oil', 'Fuel Oil #5', 'Fuel Oil #6 (low sulfur)', 'Fuel Oil #6 (high sulfur)'];
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', residualFuels, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.residualFuelUse = _.sumBy(yearData, 'energyUse');
    }

    setCoalFuels(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let coalFuels: Array<string> = ['Coal (anthracite)', 'Coal (bituminous)', 'Coal (Lignite)', 'Coal (subbituminous)']
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', coalFuels, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.coalUse = _.sumBy(yearData, 'energyUse');
    }

    setCokeFuels(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let cokeFuels: Array<string> = ['Coke', 'Coke Over Gas']
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', cokeFuels, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.cokeEnergyUse = _.sumBy(yearData, 'energyUse');
    }

    setWoodUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let woodFuels: Array<string> = ['Wood']
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', woodFuels, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.woodWasteEnergyUse = _.sumBy(yearData, 'energyUse');
    }

    setBlastFurnaceUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let blastFurnaceFuels: Array<string> = ['Blast Furnace Gas']
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', blastFurnaceFuels, undefined);
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.blastFurnaceEnergyUse = _.sumBy(yearData, 'energyUse');
    }

    setOtherGasFuelUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', undefined, 'Gas');
        this.otherGasFuels = filteredMeters.map(fMeter => { return fMeter.meter.fuel });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.otherGasUse = _.sumBy(yearData, 'energyUse');
    }

    setOtherLiquidFuelUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', undefined, 'Liquid');
        this.otherLiquidFuels = filteredMeters.map(fMeter => { return fMeter.meter.fuel });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.otherLiquidUse = _.sumBy(yearData, 'energyUse');
    }

    setOtherSolidFuelUse(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let filteredMeters: Array<CalanderizedMeter> = this.getFilteredMeters(calanderizedMeters, 'Other Fuels', undefined, 'Solid');
        this.otherSolidFuels = filteredMeters.map(fMeter => { return fMeter.meter.fuel });
        let yearData: Array<MonthlyData> = this.getYearData(filteredMeters, year);
        this.otherSolidUse = _.sumBy(yearData, 'energyUse');
    }

    getYearData(filteredMeters: Array<CalanderizedMeter>, year: number): Array<MonthlyData> {
        let meterMonthlyData: Array<MonthlyData> = filteredMeters.flatMap(sourceMeter => {
            return sourceMeter.monthlyData;
        });
        let yearData: Array<MonthlyData> = meterMonthlyData.filter(meter => {
            return meter.fiscalYear == year;
        });
        return yearData;
    }

    getFilteredMeters(calanderizedMeters: Array<CalanderizedMeter>, source: MeterSource, fuels: Array<string>, phase: string): Array<CalanderizedMeter> {
        let filteredMeters: Array<CalanderizedMeter>;
        if (!fuels && !phase) {
            filteredMeters = calanderizedMeters.filter(cMeter => {
                return cMeter.meter.source == source
            });
        } else if (fuels && source == 'Other Fuels') {
            filteredMeters = calanderizedMeters.filter(cMeter => {
                return cMeter.meter.source == source && fuels.includes(cMeter.meter.fuel);
            });
        } else if (phase) {
            filteredMeters = calanderizedMeters.filter(cMeter => {
                return cMeter.meter.source == source && cMeter.meter.phase == phase;
            });
        }
        return filteredMeters;
    }

    setTotalEnergyUse() {
        this.totalEnergyUse = (
            this.electricityUse +
            this.naturalGasUse +
            this.distilateFuelUse +
            this.residualFuelUse +
            this.coalUse +
            this.cokeEnergyUse +
            this.blastFurnaceEnergyUse +
            this.woodWasteEnergyUse +
            this.otherGasUse +
            this.otherSolidUse +
            this.otherLiquidUse
        );
    }


    setNumberOfFacilities(calanderizedMeters: Array<CalanderizedMeter>, year: number) {
        let facilityIds: Array<string> = new Array();
        calanderizedMeters.forEach(cMeter => {
            let yearData: Array<MonthlyData> = cMeter.monthlyData.filter(data => {
                return data.year == year;
            });
            if (yearData.length != 0) {
                facilityIds.push(cMeter.meter.facilityId);
            }
        });
        let uniqFacilityIds: Array<string> = _.uniq(facilityIds);
        this.numberOfFacilities = uniqFacilityIds.length;
    }


    getBetterPlantsEnergySummary(): BetterPlantsEnergySummary { 
        return {
            numberOfFacilities: this.numberOfFacilities,
            electricityUse: this.electricityUse,
            naturalGasUse: this.naturalGasUse,
            distilateFuelUse: this.distilateFuelUse,
            residualFuelUse: this.residualFuelUse,
            coalUse: this.coalUse,
            cokeEnergyUse: this.cokeEnergyUse,
            blastFurnaceEnergyUse: this.blastFurnaceEnergyUse,
            woodWasteEnergyUse: this.woodWasteEnergyUse,
            otherGasFuels: this.otherGasFuels,
            otherGasUse: this.otherGasUse,
            otherSolidFuels: this.otherSolidFuels,
            otherSolidUse: this.otherSolidUse,
            otherLiquidFuels: this.otherLiquidFuels,
            otherLiquidUse: this.otherLiquidUse,
            totalEnergyUse: this.totalEnergyUse,
        }
    }
}