import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';

@Component({
  selector: 'app-account-report-analysis-selection',
  standalone: false,
  templateUrl: './account-report-analysis-selection.component.html',
  styleUrl: './account-report-analysis-selection.component.css',
})
export class AccountReportAnalysisSelectionComponent {

  @Input()
  reportForm: FormGroup;
  @Input()
  selectedAnalysisItem: IdbAccountAnalysisItem;
  
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  itemToEdit: IdbAccountAnalysisItem;
  baselineYears: Array<number> = [];
  selectedBaselineYear: number | 'All' = 'All';
  selectedCategory: string = 'All';
  filteredAnalysisItems: Array<IdbAccountAnalysisItem>;
  calanderizedMeterSub: Subscription;

  @Output()
  selectedAnalysisItemChange: EventEmitter<IdbAccountAnalysisItem> = new EventEmitter<IdbAccountAnalysisItem>();
  @Output()
  filteredItemsChange: EventEmitter<Array<IdbAccountAnalysisItem>> = new EventEmitter<Array<IdbAccountAnalysisItem>>();

  constructor(private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private calanderizationService: CalanderizationService) {
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
    let analysisOptions: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.accountAnalysisItems = analysisOptions.filter(option => { return option.energyIsSource });
    this.applyFilters();
    this.setSelectedAnalysisItem();
  }

  viewAnalysis(analysisItem: IdbAccountAnalysisItem) {
    this.itemToEdit = analysisItem;
  }

  confirmEditItem() {
    this.accountAnalysisDbService.selectedAnalysisItem.next(this.itemToEdit);
    this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
  }

  cancelEditItem() {
    this.itemToEdit = undefined;
  }

  setSelectedAnalysisItem() {
    let selectedItem: IdbAccountAnalysisItem;
    if(!this.reportForm || !this.reportForm.controls['analysisItemId']) 
      return;
    selectedItem = this.accountAnalysisItems.find(item => { return item.guid == this.reportForm.controls.analysisItemId.value });
    this.selectedAnalysisItemChange.emit(selectedItem);    
  }

  setYearOptions() {
    let yearOptions: Array<number> = this.calanderizationService.getYearOptions('all', true);
    this.baselineYears = yearOptions;
  }

  applyFilters() {
    this.filteredAnalysisItems = [...this.accountAnalysisItems];
    if(this.selectedBaselineYear != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.baselineYear == this.selectedBaselineYear });
    }
    if(this.selectedCategory != 'All') {
      this.filteredAnalysisItems = this.filteredAnalysisItems.filter(item => { return item.analysisCategory == this.selectedCategory });
    }
    this.filteredItemsChange.emit(this.filteredAnalysisItems);
  }

  onOptionChange() {
    this.applyFilters();
    this.setSelectedAnalysisItem();
  }

  onSelectedItemChange(analysisItem: IdbAccountAnalysisItem) {
    this.selectedAnalysisItem = analysisItem;
    this.selectedAnalysisItemChange.emit(analysisItem);
  }
}
