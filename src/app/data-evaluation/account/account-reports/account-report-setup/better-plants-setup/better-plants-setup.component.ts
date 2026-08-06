import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { Component, inject, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountReportsService } from '../../account-reports.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

@Component({
  selector: 'app-better-plants-setup',
  templateUrl: './better-plants-setup.component.html',
  styleUrls: ['./better-plants-setup.component.css'],
  standalone: false
})
export class BetterPlantsSetupComponent {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);

  betterPlantsReportForm: FormGroup;
  account: IdbAccount;
  methodsUndertakenLabel: string = 'Please describe any methods undertaken to normalize energy intensity data or adjust baseline data to account for economic and other factors that affect energy use:';
  modificationNotesLabel: string = 'Please describe the energy efficient technologies, strategies, and practices employed during the previous year to decrease intensity. Please identify systems impacted and approximate savings from projects. (Ex: Furnace insulation project-12,000 MMBtu/yr savings, compressor controls upgrade-6,000 MMBtu/yr, energy awareness campaign, etc):'
  methodologyNotesLabel: string = 'Please describe the methdology used for calculating water intensity improvements:';
  selectedReportSub: Subscription;
  isFormChange: boolean = false;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  baselineYearWarning: string;
  analysisItemIdSub: Subscription;

  constructor(
    private accountReportsService: AccountReportsService,
    private injector: Injector
  ) {
  }

  ngOnInit() {
    this.account = this.accountWorkspaceStore.account();
    this.selectedReportSub = toObservable(this.accountWorkspaceStore.selectedAccountReport, { injector: this.injector }).subscribe(val => {
      if (!this.isFormChange) {
        this.betterPlantsReportForm = this.accountReportsService.getBetterPlantsFormFromReport(val.betterPlantsReportSetup);
        this.subscribeAnalysisItemChanges();
        this.setSelectedAnalysisItem();
      } else {
        this.isFormChange = false;
      }
    })
  }

  ngOnDestroy() {
    this.selectedReportSub.unsubscribe();
    this.analysisItemIdSub.unsubscribe();
  }

  subscribeAnalysisItemChanges() {
    if (this.analysisItemIdSub) {
      this.analysisItemIdSub.unsubscribe();
    }

    this.analysisItemIdSub = this.betterPlantsReportForm.controls.analysisItemId.valueChanges.subscribe(async () => {
      await this.save();
    })
  }

  async save() {
    this.isFormChange = true;
    this.setSelectedAnalysisItem();
    let selectedReport: IdbAccountReport = this.accountWorkspaceStore.selectedAccountReport();
    selectedReport.betterPlantsReportSetup = this.accountReportsService.updateBetterPlantsReportFromForm(selectedReport.betterPlantsReportSetup, this.betterPlantsReportForm);
    if (this.selectedAnalysisItem) {
      selectedReport.baselineYear = this.selectedAnalysisItem.baselineYear;
    }
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'accountReport', changeKind: 'update', entityGuid: selectedReport.guid, label: 'Save Report' },
      () => this.reportHandler.updateAccountReport(selectedReport, activeAccountGuid)
    );
    this.accountWorkspaceService.selectAccountReport(({ ...selectedReport })?.guid);
  }

  setSelectedAnalysisItem() {
    this.selectedAnalysisItem = this.accountWorkspaceQuery.getAccountAnalysisByGuid(this.betterPlantsReportForm.controls.analysisItemId.value);
    if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'water') {
      this.methodsUndertakenLabel = 'If a baseline adjustment was made, please indicate the reason for making the adjustment';
      this.modificationNotesLabel = 'Please briefly describe major technologies, strategies, and practices employed during the previous year to decrease water intensity. Please identify: systems/processes impacted, approximate water savings from projects, and implementation cost';
    } else if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'energy') {
      this.methodsUndertakenLabel = 'Please describe any methods undertaken to normalize energy intensity data or adjust baseline data to account for economic and other factors that affect energy use:';
      this.modificationNotesLabel = 'Please describe the energy efficient technologies, strategies, and practices employed during the previous year to decrease intensity. Please identify systems impacted and approximate savings from projects. (Ex: Furnace insulation project-12,000 MMBtu/yr savings, compressor controls upgrade-6,000 MMBtu/yr, energy awareness campaign, etc):';
    }
    this.setBaselineYearWarning();
  }

  setBaselineYearWarning() {
    this.baselineYearWarning = undefined;
    if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'water') {
      if (this.selectedAnalysisItem.baselineYear && this.account.sustainabilityQuestions.waterReductionGoal && this.account.sustainabilityQuestions.waterReductionBaselineYear != this.selectedAnalysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else if (this.selectedAnalysisItem && this.selectedAnalysisItem.analysisCategory == 'energy') {
      if (this.selectedAnalysisItem.baselineYear && this.account.sustainabilityQuestions.energyReductionGoal && this.account.sustainabilityQuestions.energyReductionBaselineYear != this.selectedAnalysisItem.baselineYear) {
        this.baselineYearWarning = "This baseline year does not match your corporate baseline year."
      } else {
        this.baselineYearWarning = undefined;
      }
    } else {
      this.baselineYearWarning = undefined;
    }
  }
}
