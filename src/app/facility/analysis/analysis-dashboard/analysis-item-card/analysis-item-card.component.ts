import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, AnalysisGroupPredictorVariable, JStatRegressionModel } from 'src/app/models/analysis';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisService } from '../../analysis.service';

@Component({
  selector: 'app-analysis-item-card',
  templateUrl: './analysis-item-card.component.html',
  styleUrls: ['./analysis-item-card.component.css']
})
export class AnalysisItemCardComponent implements OnInit {
  @Input()
  analysisItem: IdbAnalysisItem;

  groupItems: Array<{
    group: AnalysisGroup,
    predictorVariables: Array<AnalysisGroupPredictorVariable>,
    adjust_R2: number,
    regressionEquation: string
  }>;


  showDetailSub: Subscription;
  showDetail: boolean;
  displayDeleteModal: boolean = false;
  selectedFacility: IdbFacility;
  constructor(private analysisDbService: AnalysisDbService, private router: Router, private facilityDbService: FacilitydbService,
    private analysisService: AnalysisService, private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService, private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService) { }

  ngOnInit(): void {
    this.selectedFacility = this.facilityDbService.selectedFacility.getValue();
    this.initializeGroups();
    this.showDetailSub = this.analysisService.showDetail.subscribe(val => {
      this.showDetail = val;
    });
  }

  ngOnDestroy() {
    this.showDetailSub.unsubscribe();
  }

  initializeGroups() {
    this.groupItems = this.analysisItem.groups.map(group => {
      let predictorVariables: Array<AnalysisGroupPredictorVariable> = [];
      let adjust_R2: number = 0;
      let regressionEquation: string = '';
      if (group.analysisType == 'regression') {
        if (group.selectedModelId) {
          let selectedModel: JStatRegressionModel = group.models.find(model => { return model.modelId == group.selectedModelId });
          adjust_R2 = selectedModel.adjust_R2;
          predictorVariables = selectedModel.predictorVariables;
          regressionEquation = this.getRegressionsEquationFromModel(selectedModel);
        } else {
          predictorVariables = group.predictorVariables.filter(variable => {
            return (variable.productionInAnalysis == true);
          });
          regressionEquation = this.getRegressionEquationNoModel(group, predictorVariables);
        }
      } else if (group.analysisType != 'absoluteEnergyConsumption') {
        predictorVariables = group.predictorVariables.filter(variable => {
          return (variable.productionInAnalysis == true);
        });
      }
      return {
        group: group,
        predictorVariables: predictorVariables,
        adjust_R2: adjust_R2,
        regressionEquation: regressionEquation
      }
    });
  }


  selectAnalysisItem() {
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
    if (this.analysisItem.setupErrors.hasError || this.analysisItem.setupErrors.groupsHaveErrors) {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
    } else {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis/facility-analysis');
    }
  }


  getRegressionsEquationFromModel(model: JStatRegressionModel): string {
    //     <span *ngFor="let coefVal of model.coef; let index = index;">
    //     <span *ngIf="index == 0">{{coefVal| customNumber}}</span>
    //     <span *ngIf="index != 0">({{coefVal|
    //         customNumber}}*{{model.predictorVariables[index-1].name}})</span> <span
    //         *ngIf="index != model.coef.length-1"> +</span>
    // </span>
    let regressionEquation: string = '';
    for (let i = 0; i < model.coef.length; i++) {
      regressionEquation = regressionEquation + model.coef[i].toLocaleString(undefined, { maximumSignificantDigits: 5 });
      if (i != 0) {
        regressionEquation = regressionEquation + '*' + model.predictorVariables[i - 1].name;
      }
      if (i != model.coef.length - 1) {
        regressionEquation = regressionEquation + ' + ';
      }
    }
    return regressionEquation;
  }

  getRegressionEquationNoModel(group: AnalysisGroup, predictorVariables: Array<AnalysisGroupPredictorVariable>): string {
    let regressionEquation: string = group.regressionConstant + ' + ';
    for (let i = 0; i < predictorVariables.length; i++) {
      regressionEquation = regressionEquation + predictorVariables[i].regressionCoefficient + '*' + predictorVariables[i].name;
      if (i != predictorVariables.length - 1) {
        regressionEquation = regressionEquation + ' + ';
      }
    }
    return regressionEquation;
  }

  async createCopy() {
    let newItem: IdbAnalysisItem = JSON.parse(JSON.stringify(this.analysisItem));
    delete newItem.id;
    newItem.name = newItem.name + " (Copy)";
    newItem.guid = Math.random().toString(36).substr(2, 9);
    newItem.selectedYearAnalysis = false;
    let addedItem: IdbAnalysisItem = await firstValueFrom(this.analysisDbService.addWithObservable(newItem));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.analysisDbService.selectedAnalysisItem.next(addedItem);
    this.toastNotificationService.showToast('Analysis Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/analysis/run-analysis');
  }

  deleteItem() {
    this.displayDeleteModal = true;
  }

  async confirmDelete() {
    await firstValueFrom(this.analysisDbService.deleteWithObservable(this.analysisItem.id));
    //update account analysis items
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      let updated: boolean = false;
      accountAnalysisItems[index].facilityAnalysisItems.forEach(item => {
        if (item.facilityId == this.selectedFacility.guid && item.analysisItemId == this.analysisItem.guid) {
          item.analysisItemId = undefined;
          updated = true;
        }
      });
      if (updated) {
        await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
      }
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountAnalysisItems(selectedAccount, false)
    await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }


  async setUseItem() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let canSelectItem: boolean = this.getCanSelectItem(selectedAccount, this.selectedFacility, this.analysisItem);
    if (canSelectItem) {
      let facilityAnalysisItems: Array<IdbAnalysisItem> = this.analysisDbService.facilityAnalysisItems.getValue();
      let categoryAnalysisItems: Array<IdbAnalysisItem> = facilityAnalysisItems.filter(item => { return item.analysisCategory == this.analysisItem.analysisCategory });
      for (let i = 0; i < categoryAnalysisItems.length; i++) {
        if (categoryAnalysisItems[i].guid == this.analysisItem.guid) {
          if (categoryAnalysisItems[i].selectedYearAnalysis) {
            categoryAnalysisItems[i].selectedYearAnalysis = false;
          } else {
            categoryAnalysisItems[i].selectedYearAnalysis = true;
          }
          await firstValueFrom(this.analysisDbService.updateWithObservable(categoryAnalysisItems[i]));
        } else if (categoryAnalysisItems[i].reportYear == this.analysisItem.reportYear && categoryAnalysisItems[i].selectedYearAnalysis) {
          categoryAnalysisItems[i].selectedYearAnalysis = false;
          await firstValueFrom(this.analysisDbService.updateWithObservable(categoryAnalysisItems[i]));
        }
      }
      await this.dbChangesService.setAnalysisItems(selectedAccount, false, this.selectedFacility);
    } else {
      this.toastNotificationService.showToast('Analysis Item Cannot Be Selected', "This baseline year does not match your facility baseline year. This analysis cannot be included in reports or figures relating to the facility energy goal.", 10000, false, 'alert-danger');
    }
  }

  getCanSelectItem(account: IdbAccount, facility: IdbFacility, analysisItem: IdbAnalysisItem): boolean {
    if (analysisItem.analysisCategory == 'energy') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.energyReductionBaselineYear) {
        if (facility.isNewFacility && analysisItem.baselineYear > account.sustainabilityQuestions.energyReductionBaselineYear) {
          return true;
        } else {
          return false
        }
      } else {
        return true;
      }
    } else if (analysisItem.analysisCategory == 'water') {
      if (analysisItem.baselineYear != account.sustainabilityQuestions.waterReductionBaselineYear) {
        if (facility.isNewFacility && analysisItem.baselineYear > account.sustainabilityQuestions.waterReductionBaselineYear) {
          return true;
        } else {
          return false
        }
      } else {
        return true;
      }
    }
  }
}
