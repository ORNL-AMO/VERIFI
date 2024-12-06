import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbFacility } from '../models/idbModels/facility';

@Injectable({
    providedIn: 'root'
})
export class FacilitydbService {

    accountFacilities: BehaviorSubject<Array<IdbFacility>>;
    selectedFacility: BehaviorSubject<IdbFacility>;
    constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService, private loadingService: LoadingService) {
        this.accountFacilities = new BehaviorSubject<Array<IdbFacility>>(new Array());
        this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
        //subscribe after initialization
        this.selectedFacility.subscribe(facility => {
            if (facility) {
                this.localStorageService.store('facilityId', facility.id);
            }
        });
    }

    getInitialFacility(): number {
        let localStorageFacilityId: number = this.localStorageService.retrieve("facilityId");
        return localStorageFacilityId;
    }

    getAll(): Observable<Array<IdbFacility>> {
        return this.dbService.getAll('facilities');
    }

    async getAllAccountFacilities(accountId: string): Promise<Array<IdbFacility>> {
        let allFacilities: Array<IdbFacility> = await firstValueFrom(this.getAll());
        let accountFacilites: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == accountId });
        return accountFacilites;
    }

    getById(facilityId: number): Observable<IdbFacility> {
        return this.dbService.getByKey('facilities', facilityId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbFacility> {
        return this.dbService.getByIndex('facilities', indexName, indexValue);
    }

    count() {
        return this.dbService.count('facilities');
    }

    addWithObservable(facility: IdbFacility): Observable<IdbFacility> {
        facility.modifiedDate = new Date();
        return this.dbService.add('facilities', facility);
    }

    deleteWithObservable(facilityId: number): Observable<any> {
        return this.dbService.delete('facilities', facilityId);
    }


    updateWithObservable(values: IdbFacility): Observable<IdbFacility> {
        values.modifiedDate = new Date();
        return this.dbService.update('facilities', values);
    }

    async deleteAllSelectedAccountFacilities() {
        let accountFacilities: Array<IdbFacility> = this.accountFacilities.getValue();
        await this.deleteFacilitiesAsync(accountFacilities);
    }

    async deleteFacilitiesAsync(accountFacilities: Array<IdbFacility>) {
        for (let i = 0; i < accountFacilities.length; i++) {
            this.loadingService.setLoadingMessage('Deleting Facilities (' + i + '/' + accountFacilities.length + ')...' );
            await firstValueFrom(this.deleteWithObservable(accountFacilities[i].id));
        }
    }

    getFacilityNameById(id: string): string {
        let accountFacilites: Array<IdbFacility> = this.accountFacilities.getValue();
        let selectedFacility: IdbFacility = accountFacilites.find(facility => { return facility.guid == id });
        if (selectedFacility) {
            return selectedFacility.name;
        }
        return '';
    }

    getAccountFacilitiesCopy(): Array<IdbFacility> {
        let accountFacilites: Array<IdbFacility> = this.accountFacilities.getValue();
        let accountFacilitesCopy: Array<IdbFacility> = JSON.parse(JSON.stringify(accountFacilites));
        return accountFacilitesCopy;
    }

    getFacilityById(id: string): IdbFacility {
        let accountFacilites: Array<IdbFacility> = this.accountFacilities.getValue();
        let selectedFacility: IdbFacility = accountFacilites.find(facility => { return facility.guid == id });
        if (selectedFacility) {
            return selectedFacility;
        }
        return;
    }
}