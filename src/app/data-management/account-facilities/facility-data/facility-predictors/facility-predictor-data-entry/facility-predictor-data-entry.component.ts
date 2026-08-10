import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { from, map, Observable, of, switchAll, take } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { PredictorCommandHandler } from 'src/app/account-workspace/handlers/predictor-command-handler.service';

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
    private commandBoundary: WorkspaceCommandBoundary,
    private predictorHandler: PredictorCommandHandler,
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
    const accountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'predictorData', changeKind: 'update', entityGuid: this.predictorData.guid, label: 'Save Predictor Data' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'predictorData', upsert: [value] }] }) }},
      () => this.predictorHandler.updatePredictorData(this.predictorData, accountGuid)
    );
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
    const result = await this.commandBoundary.execute(
      { entityKind: 'predictorData', changeKind: 'add', label: 'Add Predictor Entry' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'predictorData', upsert: [value] }] }) }},
      () => this.predictorHandler.addPredictorData(newPredictorData, this.accountWorkspaceStore.account()?.guid)
    );
    this.router.navigateByUrl('data-management/' + result.value.accountId + '/facilities/' + result.value.facilityId + '/predictors/' + result.value.predictorId + '/predictor-data/edit-entry/' + result.value.guid);
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
