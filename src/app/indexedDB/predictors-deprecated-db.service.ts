import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { FacilitydbService } from './facility-db.service';
import * as _ from 'lodash';
import { DegreeDaysService } from '../shared/helper-services/degree-days.service';
import { DetailDegreeDay } from '../models/degreeDays';
import { LoadingService } from '../core-components/loading/loading.service';
import { Months } from '../shared/form-data/months';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IdbPredictorEntryDeprecated, PredictorDataDeprecated } from '../models/idbModels/deprecatedPredictors';

@Injectable({
    providedIn: 'root'
})
export class PredictordbServiceDeprecated {

    accountPredictorEntries: BehaviorSubject<Array<IdbPredictorEntryDeprecated>>;
    facilityPredictorEntries: BehaviorSubject<Array<IdbPredictorEntryDeprecated>>;
    facilityPredictors: BehaviorSubject<Array<PredictorDataDeprecated>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService, private degreeDaysService: DegreeDaysService,
        private loadingService: LoadingService, private utilityMeterDataDbService: UtilityMeterDatadbService) {
        this.facilityPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntryDeprecated>>(new Array());
        this.facilityPredictors = new BehaviorSubject<Array<PredictorDataDeprecated>>(new Array());
        this.accountPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntryDeprecated>>(new Array());
    }

    getAll(): Observable<Array<IdbPredictorEntryDeprecated>> {
        return this.dbService.getAll('predictors');
    }

    async getAllAccountPredictors(accountId: string): Promise<Array<IdbPredictorEntryDeprecated>> {
        let allPredictors: Array<IdbPredictorEntryDeprecated> = await firstValueFrom(this.getAll());
        let predictors: Array<IdbPredictorEntryDeprecated> = allPredictors.filter(predictor => { return predictor.accountId == accountId });
        return predictors;
    }

    getById(predictorId: number): Observable<IdbPredictorEntryDeprecated> {
        return this.dbService.getByKey('predictors', predictorId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbPredictorEntryDeprecated> {
        return this.dbService.getByIndex('predictors', indexName, indexValue);
    }

    count() {
        return this.dbService.count('predictors');
    }

    updateOnImport(values: IdbPredictorEntryDeprecated): Observable<any> {
        values.dbDate = new Date();
        return this.dbService.update('predictors', values);
    }

    deleteIndexWithObservable(predictorId: number): Observable<any> {
        return this.dbService.delete('predictors', predictorId)
    }

    async deleteAllFacilityPredictors(facilityId: string) {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(entry => { return entry.facilityId == facilityId });
        await this.deletePredictorsAsync(facilityPredictorEntries);
    }

    async deleteAllSelectedAccountPredictors() {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        await this.deletePredictorsAsync(accountPredictorEntries);
    }

    async deletePredictorsAsync(accountPredictorEntries: Array<IdbPredictorEntryDeprecated>) {
        for (let i = 0; i < accountPredictorEntries.length; i++) {
            if (i % 25 == 0 || i == 1) {
                this.loadingService.setLoadingMessage('Deleting Predictors (' + i + '/' + accountPredictorEntries.length + ')...');
            }
            await firstValueFrom(this.deleteIndexWithObservable(accountPredictorEntries[i].id));
        }
    }

    getNewIdbPredictorEntry(facilityId: string, accountId: string, date: Date): IdbPredictorEntryDeprecated {
        return {
            facilityId: facilityId,
            accountId: accountId,
            guid: Math.random().toString(36).substr(2, 9),
            date: date,
            predictors: new Array(),
        }
    }

    async importNewPredictor(newPredictor: PredictorDataDeprecated) {
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.facilityPredictorEntries.getValue();
        for (let i = 0; i < facilityPredictorEntries.length; i++) {
            facilityPredictorEntries[i].predictors.push(newPredictor);
            await this.updateOnImport(facilityPredictorEntries[i]);
            console.log('updated predictor');
        }
    }

    getNewPredictor(facilityPredictors: Array<PredictorDataDeprecated>): PredictorDataDeprecated {
        return {
            name: 'Predictor #' + (facilityPredictors.length + 1),
            amount: undefined,
            unit: undefined,
            description: undefined,
            id: Math.random().toString(36).substr(2, 9),
            predictorType: 'Standard',
            referencePredictorId: undefined,
            convertFrom: undefined,
            convertTo: undefined,
            conversionType: undefined,
            // mathAction: undefined,
            // mathAmount: undefined,
            weatherDataType: 'HDD'
        }
    }


    getNewPredictorEntry(): IdbPredictorEntryDeprecated {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let newPredictorDate: Date = new Date();
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.facilityPredictorEntries.getValue();
        if (facilityPredictorEntries.length != 0) {
            //find last date and add a month
            let dates: Array<Date> = facilityPredictorEntries.map(entry => { return new Date(entry.date) });
            let maxDateEntry: Date = _.max(dates);
            newPredictorDate = new Date(maxDateEntry);
            newPredictorDate.setMonth(newPredictorDate.getMonth() + 1);
        } else {
            let facilityMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
            let dates: Array<Date> = facilityMeterData.map(entry => { return new Date(entry.readDate) });
            let startReadingsDate: Date = _.min(dates);
            newPredictorDate = new Date(startReadingsDate);
        }

        let predictors: Array<PredictorDataDeprecated> = JSON.parse(JSON.stringify(this.facilityPredictors.getValue()))
        predictors.forEach(predictor => {
            predictor.amount = undefined;
        });

        let newPredictorEntry: IdbPredictorEntryDeprecated = {
            facilityId: selectedFacility.guid,
            accountId: selectedFacility.accountId,
            guid: Math.random().toString(36).substr(2, 9),
            predictors: predictors,
            date: newPredictorDate
        };
        return newPredictorEntry;
    }

    async importNewPredictorEntries(entries: Array<IdbPredictorEntryDeprecated>) {
        for (let index = 0; index < entries.length; index++) {
            let entry: IdbPredictorEntryDeprecated = entries[index];
            await firstValueFrom(this.addWithObservable(entry));
        }
    }

    async updateFacilityPredictorEntries(updatedPredictors: Array<PredictorDataDeprecated>) {
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.facilityPredictorEntries.getValue();
        let faclilityPredictors: Array<PredictorDataDeprecated> = this.facilityPredictors.getValue();
        let facilityPredictorIds: Array<string> = faclilityPredictors.map(predictor => { return predictor.id });
        //track new predictors to add
        let newPredictors: Array<PredictorDataDeprecated> = new Array();
        updatedPredictors.forEach(predictor => {
            if (!facilityPredictorIds.includes(predictor.id)) {
                newPredictors.push(predictor);
            }
        });

        //iterate entries
        for (let index = 0; index < facilityPredictorEntries.length; index++) {
            facilityPredictorEntries[index].predictors = this.updateEntryPredictors(facilityPredictorEntries[index].predictors, updatedPredictors);
            for (let newIndex = 0; newIndex < newPredictors.length; newIndex++) {
                facilityPredictorEntries[index].predictors.push(newPredictors[newIndex]);
            }
            if (facilityPredictorEntries[index].predictors.length > 0) {
                await firstValueFrom(this.updateWithObservable(facilityPredictorEntries[index]));
            } else {
                await firstValueFrom(this.deleteIndexWithObservable(facilityPredictorEntries[index].id));
            }
        }
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        await this.finishPredictorChanges(selectedFacility);
    }

    async updateFacilityPredictorEntriesInAccount(updatedPredictors: Array<PredictorDataDeprecated>, facility: IdbFacility) {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(predictorEntry => { return predictorEntry.facilityId == facility.guid });

        let faclilityPredictors: Array<PredictorDataDeprecated> = [];
        if (facilityPredictorEntries.length > 0) {
            faclilityPredictors = facilityPredictorEntries[0].predictors;
        }
        let facilityPredictorIds: Array<string> = faclilityPredictors.map(predictor => { return predictor.id });
        //track new predictors to add
        let newPredictors: Array<PredictorDataDeprecated> = new Array();
        updatedPredictors.forEach(predictor => {
            if (!facilityPredictorIds.includes(predictor.id)) {
                newPredictors.push(predictor);
            }
        });

        //iterate entries
        for (let index = 0; index < facilityPredictorEntries.length; index++) {
            facilityPredictorEntries[index].predictors = this.updateEntryPredictors(facilityPredictorEntries[index].predictors, updatedPredictors);
            for (let newIndex = 0; newIndex < newPredictors.length; newIndex++) {
                facilityPredictorEntries[index].predictors.push(newPredictors[newIndex]);
            }
            if (facilityPredictorEntries[index].predictors.length > 0) {
                await firstValueFrom(this.updateWithObservable(facilityPredictorEntries[index]));
            } else {
                console.log('DELETE ENTRY')
                await firstValueFrom(this.deleteIndexWithObservable(facilityPredictorEntries[index].id));
            }
        }
        await this.finishPredictorChanges(facility);
    }

    updateEntryPredictors(entryPredictors: Array<PredictorDataDeprecated>, updatedPredictors: Array<PredictorDataDeprecated>): Array<PredictorDataDeprecated> {
        //remove deleted predictors
        let newPredictorIds: Array<string> = updatedPredictors.map(predictor => { return predictor.id });
        entryPredictors = entryPredictors.filter(predictor => {
            return newPredictorIds.includes(predictor.id);
        });
        //update name and unit
        entryPredictors = _.map(entryPredictors, (predictor: PredictorDataDeprecated) => {
            let updatedPredictor: PredictorDataDeprecated = updatedPredictors.find(val => { return val.id == predictor.id });
            predictor.name = updatedPredictor.name;
            predictor.unit = updatedPredictor.unit;
            predictor.production = updatedPredictor.production;
            predictor.productionInAnalysis = updatedPredictor.production;
            predictor.predictorType = updatedPredictor.predictorType;
            predictor.referencePredictorId = updatedPredictor.referencePredictorId;
            predictor.conversionType = updatedPredictor.conversionType;
            predictor.convertFrom = updatedPredictor.convertFrom;
            predictor.convertTo = updatedPredictor.convertTo;
            predictor.weatherDataType = updatedPredictor.weatherDataType;
            predictor.weatherStationId = updatedPredictor.weatherStationId;
            predictor.weatherStationName = updatedPredictor.weatherStationName;
            predictor.heatingBaseTemperature = updatedPredictor.heatingBaseTemperature;
            predictor.coolingBaseTemperature = updatedPredictor.coolingBaseTemperature;
            return predictor;
        });
        return entryPredictors;
    }


    async setDegreeDays(facility: IdbFacility) {
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.facilityPredictorEntries.getValue();
        for (let index = 0; index < facilityPredictorEntries.length; index++) {
            let predictorEntry: IdbPredictorEntryDeprecated = facilityPredictorEntries[index];
            for (let predictorIndex = 0; predictorIndex < predictorEntry.predictors.length; predictorIndex++) {
                let predictorData: PredictorDataDeprecated = predictorEntry.predictors[predictorIndex];
                if (predictorData.predictorType == 'Weather' && !predictorData.weatherOverride) {
                    //get degree days
                    let dataDate: Date = new Date(predictorEntry.date)
                    this.loadingService.setLoadingMessage('Calculating Degree Days ' + Months[dataDate.getMonth()].name + ', ' + dataDate.getFullYear() + '...')
                    let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(dataDate.getMonth(), dataDate.getFullYear(), predictorData.heatingBaseTemperature, predictorData.coolingBaseTemperature, predictorData.weatherStationId);
                    if (predictorData.weatherDataType == 'CDD') {
                        let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
                        predictorData.amount = totalCDD;
                        predictorData.weatherStationId = degreeDays[0]?.stationId;
                        predictorData.weatherStationName = degreeDays[0]?.stationName;
                    }
                    if (predictorData.weatherDataType == 'HDD') {
                        let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
                        predictorData.amount = totalHDD;
                        predictorData.weatherStationId = degreeDays[0]?.stationId;
                        predictorData.weatherStationName = degreeDays[0]?.stationName;
                    }
                }
            }
            await firstValueFrom(this.updateWithObservable(facilityPredictorEntries[index]));
        }
        await this.finishPredictorChanges(facility);
    }


    async updatePredictorDegreeDays(facility: IdbFacility, facilityPredictor: PredictorDataDeprecated) {
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.facilityPredictorEntries.getValue();
        for (let index = 0; index < facilityPredictorEntries.length; index++) {
            let predictorEntry: IdbPredictorEntryDeprecated = facilityPredictorEntries[index];
            let predictorIndex: number = predictorEntry.predictors.findIndex(predictor => { return predictor.id == facilityPredictor.id });
            let predictorData: PredictorDataDeprecated = predictorEntry.predictors[predictorIndex];
            if (predictorData.predictorType == 'Weather' && !predictorData.weatherOverride) {
                //get degree days
                let dataDate: Date = new Date(predictorEntry.date)
                this.loadingService.setLoadingMessage('Calculating Degree Days ' + Months[dataDate.getMonth()].name + ', ' + dataDate.getFullYear() + '...')
                let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(dataDate.getMonth(), dataDate.getFullYear(), predictorData.heatingBaseTemperature, predictorData.coolingBaseTemperature, predictorData.weatherStationId);
                let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
                    return degreeDay.gapInData == true
                })

                if (predictorData.weatherDataType == 'CDD') {
                    let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
                    predictorData.amount = totalCDD;
                }
                if (predictorData.weatherDataType == 'HDD') {
                    let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
                    predictorData.amount = totalHDD;
                }
                predictorData.weatherStationId = degreeDays[0]?.stationId;
                predictorData.weatherStationName = degreeDays[0]?.stationName;
                predictorData.weatherDataWarning = hasErrors != undefined;
            }
            await firstValueFrom(this.updateWithObservable(facilityPredictorEntries[index]));
        }
        await this.finishPredictorChanges(facility);
    }



    async createPredictorHeatingCoolingDegreeDays(facility: IdbFacility, heatingPredictor?: PredictorDataDeprecated, coolingPredictor?: PredictorDataDeprecated) {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(predictorEntry => { return predictorEntry.facilityId == facility.guid });
        for (let index = 0; index < facilityPredictorEntries.length; index++) {
            //get degree days
            let weatherStationId: string;
            let heatingBaseTemperature: number = 0;
            if (heatingPredictor) {
                weatherStationId = heatingPredictor.weatherStationId;
                heatingBaseTemperature = heatingPredictor.heatingBaseTemperature;
            }
            let coolingBaseTemperature: number = 0;
            if (coolingPredictor) {
                weatherStationId = coolingPredictor.weatherStationId;
                coolingBaseTemperature = coolingPredictor.coolingBaseTemperature;
            }
            let predictorEntry: IdbPredictorEntryDeprecated = facilityPredictorEntries[index];
            let dataDate: Date = new Date(predictorEntry.date)
            this.loadingService.setLoadingMessage('Calculating Degree Days ' + Months[dataDate.getMonth()].name + ', ' + dataDate.getFullYear() + '...')
            let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(dataDate.getMonth(), dataDate.getFullYear(), heatingBaseTemperature, coolingBaseTemperature, weatherStationId);
            let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
                return degreeDay.gapInData == true
            });
            if (heatingPredictor) {
                let heatingPredictorIndex: number = predictorEntry.predictors.findIndex(predictor => { return predictor.id == heatingPredictor.id });
                let heatingPredictorData: PredictorDataDeprecated = predictorEntry.predictors[heatingPredictorIndex];
                let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
                heatingPredictorData.amount = totalHDD;
                heatingPredictorData.weatherStationId = degreeDays[0]?.stationId;
                heatingPredictorData.weatherStationName = degreeDays[0]?.stationName;
                heatingPredictorData.weatherDataWarning = hasErrors != undefined;
            }
            if (coolingPredictor) {
                let coolingPredictorIndex: number = predictorEntry.predictors.findIndex(predictor => { return predictor.id == coolingPredictor.id });
                let coolingPredictorData: PredictorDataDeprecated = predictorEntry.predictors[coolingPredictorIndex];
                let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
                coolingPredictorData.amount = totalCDD;
                coolingPredictorData.weatherStationId = degreeDays[0]?.stationId;
                coolingPredictorData.weatherStationName = degreeDays[0]?.stationName;
                coolingPredictorData.weatherDataWarning = hasErrors != undefined;
            }
            await firstValueFrom(this.updateWithObservable(facilityPredictorEntries[index]));
        }
        await this.finishPredictorChanges(facility);
    }

    async finishPredictorChanges(facility: IdbFacility) {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = await this.getAllAccountPredictors(facility.accountId);
        this.accountPredictorEntries.next(accountPredictorEntries);
        let updatedFacilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(predictor => { return predictor.facilityId == facility.guid });
        this.facilityPredictorEntries.next(updatedFacilityPredictorEntries);
        if (updatedFacilityPredictorEntries.length > 0) {
            this.facilityPredictors.next(updatedFacilityPredictorEntries[0].predictors);
        } else {
            this.facilityPredictors.next([]);
        }
    }


    updateWithObservable(values: IdbPredictorEntryDeprecated): Observable<any> {
        values.date = new Date(values.date);
        values.dbDate = new Date();
        return this.dbService.update('predictors', values)
    }

    addWithObservable(predictor: IdbPredictorEntryDeprecated): Observable<IdbPredictorEntryDeprecated> {
        predictor.date = new Date(predictor.date);
        predictor.dbDate = new Date();
        return this.dbService.add('predictors', predictor);
    }

    getAccountPerdictorsCopy(): Array<IdbPredictorEntryDeprecated> {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        let predictorsCopy: Array<IdbPredictorEntryDeprecated> = JSON.parse(JSON.stringify(accountPredictorEntries));
        return predictorsCopy;
    }

}
