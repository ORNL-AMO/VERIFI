import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ViewChild, Component, effect, inject, Signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';

@Component({
  selector: 'app-run-analysis',
  templateUrl: './run-analysis.component.html',
  styleUrls: ['./run-analysis.component.css'],
  standalone: false
})
export class RunAnalysisComponent {
  @ViewChild(RouterOutlet) private outlet: RouterOutlet;

  readonly beforeNavigate = () => this.canDeactivate();

  canDeactivate(): Promise<boolean> {
    const child = this.outlet?.isActivated ? this.outlet.component as { canDeactivate?: () => Promise<boolean> | boolean } : undefined;
    return Promise.resolve(child?.canDeactivate?.() ?? true);
  }

  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
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
