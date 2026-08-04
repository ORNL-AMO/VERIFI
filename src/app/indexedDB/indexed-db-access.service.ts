import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom } from 'rxjs';
import { VerifiRelationshipIndexName, VerifiStoreName } from './indexed-db-schema';

@Injectable({
  providedIn: 'root'
})
export class IndexedDbAccessService {

  constructor(private dbService: NgxIndexedDBService) { }

  async getAllByIndex<T extends { id?: number }>(
    storeName: VerifiStoreName,
    indexName: VerifiRelationshipIndexName,
    indexValue: IDBValidKey
  ): Promise<Array<T>> {
    const records = await firstValueFrom(
      this.dbService.getAllByIndex<T>(storeName, indexName, indexValue)
    );
    return [...records].sort((first, second) => {
      return (first.id ?? Number.MAX_SAFE_INTEGER) - (second.id ?? Number.MAX_SAFE_INTEGER);
    });
  }

  async getByGuid<T extends { id?: number; guid: string }>(
    storeName: VerifiStoreName,
    guid: string
  ): Promise<T | undefined> {
    const records = await this.getAllByIndex<T>(storeName, 'guid', guid);
    return records[0];
  }

  async deleteAllByIndex(
    storeName: VerifiStoreName,
    indexName: VerifiRelationshipIndexName,
    indexValue: IDBValidKey
  ): Promise<void> {
    await firstValueFrom(
      this.dbService.deleteAllByIndex(storeName, indexName, indexValue)
    );
  }
}
