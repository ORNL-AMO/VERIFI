import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import { ModalPortalService } from '../../shell/modal-portal.service';

export type PortfolioTabPath = 'facilities' | 'meters' | 'predictors' | 'energy-uses' | 'analyses' | 'reports';

interface PortfolioSelectorSummary {
  readonly path: PortfolioTabPath;
  readonly label: string;
  readonly icon: IconName;
  readonly total: number;
}

interface PortfolioTotals {
  readonly facilities: number;
  readonly meters: number;
  readonly predictors: number;
  readonly energyUses: number;
  readonly analyses: number;
  readonly reports: number;
}

const PORTFOLIO_SELECTORS: ReadonlyArray<Omit<PortfolioSelectorSummary, 'total'>> = [
  { path: 'facilities', label: 'Facilities', icon: 'account' },
  { path: 'meters', label: 'Meters', icon: 'meter' },
  { path: 'predictors', label: 'Predictors', icon: 'chartLine' },
  { path: 'energy-uses', label: 'Energy Uses', icon: 'tools' },
  { path: 'analyses', label: 'Analyses', icon: 'barChart' },
  { path: 'reports', label: 'Reports', icon: 'reports' }
];

@Component({
  selector: 'app-account-portfolio',
  templateUrl: './account-portfolio.component.html',
  styleUrls: ['./account-portfolio.component.css'],
  standalone: false
})
export class AccountPortfolioComponent implements OnDestroy {
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('createFacilityDrawer') private readonly createFacilityDrawer!: TemplateRef<unknown>;

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly isCreateFacilityDrawerOpen = signal(false);

  ngOnDestroy(): void {
    this.modalPortal.hide();
  }

  readonly totals = computed<PortfolioTotals>(() => {
    return {
      facilities: this.workspace.facilities().length,
      meters: this.workspace.meters().length,
      predictors: this.workspace.predictors().length,
      energyUses: this.workspace.energyUseEquipment().length,
      analyses: this.workspace.facilityAnalyses().length,
      reports: this.workspace.facilityReports().length
    };
  });

  readonly portfolioSelectors = computed<PortfolioSelectorSummary[]>(() => {
    const totals = this.totals();
    return PORTFOLIO_SELECTORS.map(selector => ({
      ...selector,
      total: this.getSelectorTotal(selector.path, totals)
    }));
  });

  openCreateFacilityDrawer(): void {
    if (!this.canWrite() || this.hasPending()) {
      return;
    }
    this.isCreateFacilityDrawerOpen.set(true);
    this.modalPortal.show(new TemplatePortal(this.createFacilityDrawer, this.viewContainerRef));
  }

  closeCreateFacilityDrawer(): void {
    this.isCreateFacilityDrawerOpen.set(false);
    this.modalPortal.hide();
  }

  private getSelectorTotal(path: PortfolioTabPath, totals: PortfolioTotals): number {
    switch (path) {
      case 'meters':
        return totals.meters;
      case 'predictors':
        return totals.predictors;
      case 'energy-uses':
        return totals.energyUses;
      case 'analyses':
        return totals.analyses;
      case 'reports':
        return totals.reports;
      default:
        return totals.facilities;
    }
  }
}
