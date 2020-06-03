import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class AccountdbService {
  constructor(private dbService: NgxIndexedDBService) {}
    getAll() {
        return this.dbService.getAll('accounts');
    }

    getByKey(index) {
        return this.dbService.getByKey('accounts', index);
    }
    
    add() {
        return this.dbService.add('accounts', {
            name: 'New Account', 
            industry: '',
            naics: '000000',
            notes: '',
            img: 'https://placehold.it/50x50'}
        );
    }

    update(values) {
        return this.dbService.update('accounts', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('accounts', index);
    }

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
        this.dbService.add('accounts', {
            name: 'Captain Crunch', 
            industry: 'Cereal',
            naics: '123456',
            notes: 'Delicious',
            img: 'https://placehold.it/50x50'}
        );

        this.dbService.add('accounts', {
            name: 'Mini Wheets', 
            industry: 'Cereal',
            naics: '555555',
            notes: 'The frosted kind',
            img: 'https://placehold.it/50x50'}
        );

        return this.dbService.add('accounts', {
            name: 'Special K', 
            industry: 'Cereal',
            naics: '234567',
            notes: 'Not the worst',
            img: 'https://placehold.it/50x50'}
        );
    }
}
