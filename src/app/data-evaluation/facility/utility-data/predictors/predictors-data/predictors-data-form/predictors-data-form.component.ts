import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, from, map, Observable, of, Subscription, switchAll, take } from 'rxjs';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { RouterGuardService } from 'src/app/shared/shared-router-guard-modal/router-guard-service';

@Component({
  selector: 'app-predictors-data-form',
  templateUrl: './predictors-data-form.component.html',
  styleUrl: './predictors-data-form.component.css',
  standalone: false,
  host: {
    '(window:keydown)': 'handleKeyDown($event)'
  }
})
export class PredictorsDataFormComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  addOrEdit: 'add' | 'edit';
  predictor: IdbPredictor;
  predictorData: IdbPredictorData;
  calculatingDegreeDays: boolean;
  isSaved: boolean = true;
  paramsSub: Subscription;

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
    private router: Router,
    private loadingService: LoadingService,
    private toastNotificationService: ToastNotificationsService,
    private predictorDataDbService: PredictorDataDbService,
    private routerGuardService: RouterGuardService
  ) {
  }

  ngOnInit() {
    this.paramsSub = this.activatedRoute.parent.params.subscribe(params => {
      let predictorId: string = params['id'];
      this.predictor = this.accountWorkspaceQuery.getPredictorByGuid(predictorId);
    });

    this.activatedRoute.params.subscribe(params => {
      let predictorId: string = params['id'];
      if (predictorId) {
        this.addOrEdit = 'edit';
        this.setPredictorEntryEdit(predictorId);
      } else {
        this.addOrEdit = 'add';
        this.setNewPredictorEntry();
      }
    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

  cancel() {
    this.isSaved = true;
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/utility/predictors/predictor/' + this.predictor.guid)
  }

  async saveChanges() {
    this.loadingService.setLoadingMessage('Savings Predictor Entry...');
    this.loadingService.setLoadingStatus(true);
    if (this.addOrEdit == "edit") {
      await firstValueFrom(this.predictorDataDbService.updateWithObservable(this.predictorData));
    } else {
      await firstValueFrom(this.predictorDataDbService.addWithObservable(this.predictorData));
    }
    let selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.isSaved = true;
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Predictors Updated!', undefined, undefined, false, 'alert-success');
  }

  setPredictorEntryEdit(predictorId: string) {
    let predictorData: IdbPredictorData = this.accountWorkspaceQuery.getPredictorDataByGuid(predictorId);
    this.predictorData = JSON.parse(JSON.stringify(predictorData));
  }

  setNewPredictorEntry() {
    let predictorDataEntries: Array<IdbPredictorData> = this.accountWorkspaceQuery.getPredictorData(this.predictor.guid);
    this.predictorData = getNewIdbPredictorData(this.predictor, predictorDataEntries);
  }

  setChanged() {
    this.isSaved = false;
  }

  canDeactivate(): Observable<boolean> {
    if (!this.isSaved) {
      this.routerGuardService.setShowSave(true);
      this.routerGuardService.setShowModal(true);
      return this.routerGuardService.getModalAction().pipe(map(action => {
        if (action == 'save') {
          return from(this.saveChanges()).pipe(map(() => true));
        } else if (action == 'discard') {
          return of(true);
        }
        return of(false);
      }),
        take(1), switchAll());
    }
    return of(true);
  }

  setWeatherManually() {
    if (this.predictor.predictorType == 'Weather') {
      this.predictorData.weatherOverride = true;
      this.predictorData.weatherDataWarning = false;
    }
  }

  async saveAndQuit() {
    await this.saveChanges();
    this.cancel();
  }

  async saveAndAddAnother() {
    await this.saveChanges();
    this.setNewPredictorEntry();
    this.isSaved = false;
  }

  onSavedChanges(isSaved: boolean) {
    this.isSaved = isSaved;
  }
}
