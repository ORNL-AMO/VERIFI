import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbSavedVisualization } from '@data/models/idbModels/saved-visualization';
import { IndexedDbAccessService } from './indexed-db-access.service';

/** Persistence only; workspace commands own validation and publication. */
@Injectable({ providedIn: 'root' })
export class SavedVisualizationsDbService {
  constructor(private readonly db: NgxIndexedDBService, private readonly access: IndexedDbAccessService) { }

  getAll(): Observable<IdbSavedVisualization[]> {
    return this.db.getAll('savedVisualizations');
  }

  getAllAccountVisualizations(accountId: string): Promise<IdbSavedVisualization[]> {
    return this.access.getAllByIndex<IdbSavedVisualization>('savedVisualizations', 'accountId', accountId);
  }

  getStoredByGuid(guid: string): Promise<IdbSavedVisualization | undefined> {
    return this.access.getByGuid<IdbSavedVisualization>('savedVisualizations', guid);
  }

  addWithObservable(record: IdbSavedVisualization): Observable<IdbSavedVisualization> {
    return this.db.add('savedVisualizations', record);
  }

  updateWithObservable(record: IdbSavedVisualization): Observable<IdbSavedVisualization> {
    return this.db.update('savedVisualizations', record);
  }

  deleteWithObservable(id: number): Observable<unknown> {
    return this.db.delete('savedVisualizations', id);
  }
}
