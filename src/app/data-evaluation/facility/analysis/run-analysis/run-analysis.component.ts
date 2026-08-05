import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, effect, inject, OnInit, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';

@Component({
  selector: 'app-run-analysis',
  templateUrl: './run-analysis.component.html',
  styleUrls: ['./run-analysis.component.css'],
  standalone: false
})
export class RunAnalysisComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private router: Router = inject(Router);

  analysisItem: Signal<IdbAnalysisItem> = this.accountWorkspaceStore.selectedFacilityAnalysis;

  constructor() {
    effect(() => {
      const analysisItem = this.analysisItem();
      if (!analysisItem) {
        this.router.navigateByUrl('/data-evaluation/analysis/analysis-dashboard')
      }
    })
  }

}
