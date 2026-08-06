import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, from, map, Observable, of, switchAll, take } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-facility-predictor-data-entry',
  templateUrl: './facility-predictor-data-entry.component.html',
  styleUrl: './facility-predictor-data-entry.component.css',
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class FacilityPredictorDataEntryComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facility: IdbFacility;
  predictor: IdbPredictor;
  predictorData: IdbPredictorData;

  showDeletePredictorEntry: boolean = false;
  isSaved: boolean = true;
  calculatingDegreeDays: boolean;

  handleKeyDown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (!this.calculatingDegreeDays) {
        this.saveAndQuit();
      }
    }
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private toastNotificationService: ToastNotificationsService,
    private router: Router,
    private predictorDataDbService: PredictorDataDbService,
    private routerGuardService: RouterGuardService

  ) {
  }

  ngOnInit() {
    this.facility = this.accountWorkspaceStore.selectedFacility();
    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.setPredictorEntry(predictorId);
      } else {
        this.goToManagePredictors();
      }
    });
  }


  setPredictorEntry(entryGuid: string) {
    let predictorData: IdbPredictorData = this.accountWorkspaceQuery.getPredictorDataByGuid(entryGuid);
    if (predictorData) {
      this.predictorData = JSON.parse(JSON.stringify(predictorData));
      this.predictor = this.accountWorkspaceQuery.getPredictorByGuid(this.predictorData.predictorId);
    } else {
      this.goToManagePredictors();
    }
  }

  async save() {
    this.isSaved = true;
    await firstValueFrom(this.predictorDataDbService.updateWithObservable(this.predictorData));
    let account: IdbAccount = this.accountWorkspaceStore.account();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
  }

  async saveAndQuit() {
    await this.save();
    this.toastNotificationService.showToast('Predictor data changes saved!', undefined, undefined, undefined, 'alert-success');
    this.cancel();
  }

  async saveAndAddAnother() {
    await this.save();
    let predictorData: Array<IdbPredictorData> = this.accountWorkspaceQuery.getPredictorData(this.predictor.guid);
    let newPredictorData: IdbPredictorData = getNewIdbPredictorData(this.predictor, predictorData);
    newPredictorData = await firstValueFrom(this.predictorDataDbService.addWithObservable(newPredictorData));
    let account: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.router.navigateByUrl('data-management/' + newPredictorData.accountId + '/facilities/' + newPredictorData.facilityId + '/predictors/' + newPredictorData.predictorId + '/predictor-data/edit-entry/' + newPredictorData.guid);
    this.toastNotificationService.showToast('Predictor entry added!', undefined, undefined, undefined, 'alert-success');
  }


  goToManagePredictors() {
    this.router.navigateByUrl('data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors')
  }

  canDeactivate(): Observable<boolean> {
    if (!this.isSaved) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveAndQuit()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

  onSavedChanges(isSaved: boolean) {
    this.isSaved = isSaved;
  }

  cancel() {
    this.isSaved = true;
    this.router.navigateByUrl('data-management/' + this.facility.accountId + '/facilities/' + this.facility.guid + '/predictors/' + this.predictor.guid + '/predictor-data');
  }
}
