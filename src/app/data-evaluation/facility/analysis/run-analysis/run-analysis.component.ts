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
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private router: Router = inject(Router);

  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);

  constructor() {
    effect(() => {
      const analysisItem = this.analysisItem();
      if (!analysisItem) {
        this.router.navigateByUrl('/data-evaluation/analysis/analysis-dashboard')
      }
    })
  }

}
