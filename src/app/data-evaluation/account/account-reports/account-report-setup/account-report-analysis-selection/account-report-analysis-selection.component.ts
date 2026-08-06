import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-account-report-analysis-selection',
  standalone: false,
  templateUrl: './account-report-analysis-selection.component.html',
  styleUrl: './account-report-analysis-selection.component.css',
})
export class AccountReportAnalysisSelectionComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input({ required: true })
  reportForm: FormGroup;

  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  itemToEdit: IdbAccountAnalysisItem;
  baselineYears: Array<number> = [];
  selectedBaselineYear: number | 'All' = 'All';
  selectedCategory: string = 'All';
  filteredAnalysisItems: Array<IdbAccountAnalysisItem>;
  calanderizedMeterSub: Subscription;

  constructor(
    private router: Router,
    private calanderizationService: CalanderizationService
  ) {
  }

  ngOnInit() {
    this.calanderizedMeterSub = this.calanderizationService.calanderizedMeters.subscribe(() => {
      this.setYearOptions();
      this.setAnalysisOptions();
    });
  }

  ngOnDestroy() {
    this.calanderizedMeterSub.unsubscribe();
  }

  setAnalysisOptions() {
    let analysisOptions: Array<IdbAccountAnalysisItem> = [...this.accountWorkspaceStore.accountAnalyses()];
    this.accountAnalysisItems = analysisOptions.filter(option => { return option.energyIsSource });
    this.applyFilters();
    this.setSelectedAnalysisItem();
  }

  viewAnalysis(analysisItem: IdbAccountAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  confirmEditItem() {
    this.accountWorkspaceService.selectAccountAnalysis((this.itemToEdit)?.guid);
    this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }

  setSelectedAnalysisItem() {
    let selectedItem: IdbAccountAnalysisItem;
    if (!this.reportForm || !this.reportForm.controls['analysisItemId'] || !this.reportForm.controls['analysisItemId'].value) {
      return;
    }

    //check item is in filtered list
    selectedItem = this.filteredAnalysisItems.find(item => { return item.guid == this.reportForm.controls.analysisItemId.value });
    //if item not in list set undefined
    if (!selectedItem) {
      this.reportForm.controls['analysisItemId'].patchValue(undefined);
    }
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', true);
    this.baselineYears = yearOptions;
  }

  applyFilters() {
    this.filteredAnalysisItems = [...this.accountAnalysisItems];
    if (this.selectedBaselineYear != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.baselineYear == this.selectedBaselineYear });
    }
    if (this.selectedCategory != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.analysisCategory == this.selectedCategory });
    }
  }

  onOptionChange() {
    this.applyFilters();
    this.setSelectedAnalysisItem();
  }
}
