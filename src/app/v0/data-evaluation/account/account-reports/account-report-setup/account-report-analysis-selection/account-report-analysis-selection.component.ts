import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Component, Input, Signal, WritableSignal, computed, effect, inject, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { AccountAnalysisStatusCheck } from '@domain/calculations/status-check-calculations/accountAnalysisStatusCheck';
import { AccountStatusCheckService } from '@shared/helper-services/account-status-check.service';

interface AnalysisDetailsTableRow {
  analysisItem: IdbAccountAnalysisItem,
  statusCheck: AccountAnalysisStatusCheck | undefined
}

@Component({
  selector: 'app-account-report-analysis-selection',
  standalone: false,
  templateUrl: './account-report-analysis-selection.component.html',
  styleUrl: './account-report-analysis-selection.component.css',
})
export class AccountReportAnalysisSelectionComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly router = inject(Router);
  private readonly calanderizationService = inject(CalanderizationService);
  private readonly accountStatusCheckService = inject(AccountStatusCheckService);

  @Input({ required: true })
  reportForm: FormGroup;

  calendarizedMeters = toSignal(this.calanderizationService.calanderizedMeters, { initialValue: [] });
  selectedBaselineYear: WritableSignal<number | 'All'> = signal('All');
  selectedCategory: WritableSignal<'All' | 'energy' | 'water'> = signal('All');
  itemToEdit: WritableSignal<IdbAccountAnalysisItem | undefined> = signal(undefined);
  accountStatusCheck = toSignal(this.accountStatusCheckService.accountStatusCheck);

  accountAnalysisItems: Signal<Array<IdbAccountAnalysisItem>> = computed(() => {
    this.calendarizedMeters();
    return [...this.accountWorkspaceStore.accountAnalyses().filter(option => option.energyIsSource)];
  });

  baselineYears: Signal<Array<number>> = computed(() => {
    this.calendarizedMeters();
    return this.calanderizationService.getYearOptions('all', true);
  });

  filteredAnalysisItems: Signal<Array<AnalysisDetailsTableRow>> = computed(() => {
    const items = this.accountAnalysisItems();
    const baselineYear = this.selectedBaselineYear();
    const category = this.selectedCategory();
    const accountStatusCheck = this.accountStatusCheck();
    let filtered = [...items];
    let analysisDetailItems: Array<AnalysisDetailsTableRow> = [];
    if (baselineYear !== 'All') {
      filtered = filtered.filter(item => item.baselineYear === baselineYear);
    }
    if (category !== 'All') {
      filtered = filtered.filter(item => item.analysisCategory === category);
    }
    filtered.forEach(item => {
      const status = accountStatusCheck?.getAccountAnalysisStatusCheckById(item.guid);
      analysisDetailItems.push({ analysisItem: item, statusCheck: status });
    });
    return analysisDetailItems;
  });


  constructor() {
    effect(() => {
      const form = this.reportForm;
      const filtered = this.filteredAnalysisItems();
      const selectedItemId = form?.controls?.['analysisItemId']?.value;

      if (!form || !selectedItemId) {
        return;
      }
      const selectedItem = filtered.find(item => item.analysisItem.guid === selectedItemId);
      if (!selectedItem) {
        form.controls['analysisItemId'].patchValue(undefined);
      }
    });
  }

  viewAnalysis(analysisItem: IdbAccountAnalysisItem) {
    this.itemToEdit.set(analysisItem);
  }

  confirmEditItem() {
    const item = this.itemToEdit();
    this.accountWorkspaceService.selectAccountAnalysis(item?.guid);
    this.router.navigateByUrl('/data-evaluation/account/analysis/results/annual-analysis');
  }

  cancelEditItem() {
    this.itemToEdit.set(undefined);
  }
}
