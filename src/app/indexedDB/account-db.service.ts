import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount } from '../models/idb';

@Injectable({
    providedIn: 'root'
})
export class AccountdbService {
    constructor(private dbService: NgxIndexedDBService) { }

    getAll(): Promise<Array<IdbAccount>> {
        return this.dbService.getAll('accounts');
    }

    getById(accountId: number): Promise<IdbAccount> {
        return this.dbService.getByKey('accounts', accountId);
    }

    count() {
        return this.dbService.count('accounts');
    }

    add(account: IdbAccount): Promise<any> {
        return this.dbService.add('accounts', account);
    }

    update(account: IdbAccount): Promise<any> {
        return this.dbService.update('accounts', account);
    }

    deleteIndex(accountId: number): Promise<any> {
        return this.dbService.delete('accounts', accountId);
    }

    //TODO: MOVE
    // *WARNING* Can not be undone
    deleteDatabase() {
        this.dbService.deleteDatabase().then(
            () => {
                console.log('Database deleted successfully');
            },
            error => {
                console.log(error);
            }
        );
    }
    addTestData() {
        TestAccountData.forEach(accountItem => {
            this.add(accountItem);
        });
    }

    getNewIdbAccount(): IdbAccount {
        return {
            name: 'New Account',
            industry: '',
            naics: '000000',
            notes: '',
            img: 'https://placehold.it/50x50',
            id: undefined
        }
    }
}


export const TestAccountData: Array<IdbAccount> = [
    {
        id: undefined,
        name: 'Captain Crunch',
        industry: 'Cereal',
        naics: '123456',
        notes: 'Delicious',
        img: 'https://placehold.it/50x50'
    },
    {
        id: undefined,
        name: 'Mini Wheets',
        industry: 'Cereal',
        naics: '555555',
        notes: 'The frosted kind',
        img: 'https://placehold.it/50x50'
    },
    {
        id: undefined,
        name: 'Special K',
        industry: 'Cereal',
        naics: '234567',
        notes: 'Not the worst',
        img: 'https://placehold.it/50x50'
    }
]