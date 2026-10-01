import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { DataWorkbenchTabsComponent } from '@app/v1/shared/data-workbench/data-workbench-tabs.component';
import { FacilityAnalysisWorkbenchContext } from '../facility-analysis-workbench-context.service';

@Component({
  selector: 'app-facility-analysis-results-shell',
  standalone: true,
  imports: [RouterOutlet, DataWorkbenchTabsComponent],
  templateUrl: './facility-analysis-results-shell.component.html',
  styleUrls: ['./facility-analysis-results-shell.component.css']
})
export class FacilityAnalysisResultsShellComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly context = inject(FacilityAnalysisWorkbenchContext);
  readonly activeTab = signal<'annual' | 'monthly'>(this.router.url.endsWith('/monthly') ? 'monthly' : 'annual');
  readonly tabs = [
    { id: 'annual', label: 'Annual', icon: 'calendar' as const },
    { id: 'monthly', label: 'Monthly', icon: 'table' as const }
  ];

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(event => this.activeTab.set(event.urlAfterRedirects.endsWith('/monthly') ? 'monthly' : 'annual'));
  }

  openTab(tab: string): void {
    if (tab !== 'annual' && tab !== 'monthly') return;
    const facility = this.context.facility();
    const analysis = this.context.analysis();
    if (facility && analysis) {
      void this.router.navigate(['/v1', 'workspace', 'facility', facility.guid, 'analysis', 'workbench', analysis.guid, 'facility', tab]);
    }
  }
}
