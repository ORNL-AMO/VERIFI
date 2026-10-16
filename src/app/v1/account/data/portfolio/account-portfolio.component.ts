import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountPortfolioTab, WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { IconName } from '@app/v1/shared/icons/icon-registry';

interface PortfolioTotals {
  readonly facilities: number;
  readonly analyses: number;
}

@Component({
  selector: 'app-account-portfolio',
  templateUrl: './account-portfolio.component.html',
  styleUrls: ['./account-portfolio.component.css'],
  standalone: false
})
export class AccountPortfolioComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly element = inject(ElementRef<HTMLElement>);
  private headerResizeObserver?: ResizeObserver;
  private scrollMarkerObserver?: IntersectionObserver;
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('scrollMarker') set scrollMarker(marker: ElementRef<HTMLElement> | undefined) {
    this.scrollMarkerObserver?.disconnect();
    this.scrollMarkerObserver = undefined;
    this.headerGapCollapsed.set(false);
    if (marker && typeof IntersectionObserver !== 'undefined') {
      let root = marker.nativeElement.parentElement;
      while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) {
        root = root.parentElement;
      }
      this.scrollMarkerObserver = new IntersectionObserver(entries => {
        const entry = entries[0];
        if (entry) { this.headerGapCollapsed.set(!entry.isIntersecting); }
      }, { root });
      this.scrollMarkerObserver.observe(marker.nativeElement);
    }
  }

  @ViewChild('portfolioSticky') set stickyHeader(header: ElementRef<HTMLElement> | undefined) {
    this.headerResizeObserver?.disconnect();
    this.headerResizeObserver = undefined;
    if (!header) {
      this.element.nativeElement.style.removeProperty('--portfolio-sticky-height');
      return;
    }
    const updateHeight = () => this.element.nativeElement.style.setProperty(
      '--portfolio-sticky-height', `${header.nativeElement.getBoundingClientRect().height}px`
    );
    updateHeight();
    if (typeof ResizeObserver !== 'undefined') {
      this.headerResizeObserver = new ResizeObserver(updateHeight);
      this.headerResizeObserver.observe(header.nativeElement, { box: 'border-box' });
    }
  }

  @ViewChild('createFacilityDrawer') private readonly createFacilityDrawer!: TemplateRef<unknown>;

  @ViewChild('createMeterDrawer') private readonly createMeterDrawer!: TemplateRef<unknown>;
  private readonly meterDrawerAccountGuid = signal<string | undefined>(undefined);

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly activeContent = computed(() => this.navigation.activePortfolioTab() || 'facilities');
  readonly isFacilities = computed(() => this.activeContent() === 'facilities');
  readonly isMeters = computed(() => this.activeContent() === 'meters');
  readonly title = computed(() => ({
    facilities: 'Facilities', meters: 'Meters', predictors: 'Predictors',
    'energy-uses': 'Energy Uses', analyses: 'Analyses', reports: 'Reports'
  })[this.activeContent()]);
  readonly headerIcon = computed(() => ({
    facilities: 'facility', meters: 'meter', predictors: 'predictor',
    'energy-uses': 'tools', analyses: 'analysis', reports: 'reports'
  } satisfies Record<AccountPortfolioTab, IconName>)[this.activeContent()]);
  readonly isCreateMeterDrawerOpen = signal(false);
  readonly headerGapCollapsed = signal(false);
  readonly meterNavigationError = signal('');
  readonly showUpload = computed(() => !['analyses', 'reports'].includes(this.activeContent()));
  readonly isCreateFacilityDrawerOpen = signal(false);

  constructor() {
    effect(() => {
      if (this.isCreateMeterDrawerOpen()
        && (!this.isMeters() || this.account()?.guid !== this.meterDrawerAccountGuid())) {
        this.closeCreateMeterDrawer();
      }
    });
  }

  openCreateMeterDrawer(): void {
    if (!this.isMeters() || !this.canWrite() || this.hasPending() || !this.totals().facilities) { return; }
    this.meterNavigationError.set('');
    this.meterDrawerAccountGuid.set(this.account()?.guid);
    this.isCreateMeterDrawerOpen.set(true);
    this.modalPortal.show(new TemplatePortal(this.createMeterDrawer, this.viewContainerRef));
  }

  closeCreateMeterDrawer(): void {
    this.isCreateMeterDrawerOpen.set(false);
    this.modalPortal.hide();
  }

  async openCreatedMeter(meter: IdbUtilityMeter): Promise<void> {
    this.closeCreateMeterDrawer();
    if (meter.accountId !== this.account()?.guid) { return; }
    try {
      const opened = await this.router.navigate(this.navigation.facilityMeterRoute(meter.facilityId, meter.guid, 'settings'));
      if (!opened) { throw new Error('Navigation cancelled'); }
    } catch {
      this.meterNavigationError.set('Meter added. Its settings could not be opened; select the meter from the list to continue.');
    }
  }

  ngOnDestroy(): void {
    this.headerResizeObserver?.disconnect();
    this.scrollMarkerObserver?.disconnect();
    this.modalPortal.hide();
  }

  readonly totals = computed<PortfolioTotals>(() => {
    return {
      facilities: this.workspace.facilities().length,
      analyses: this.workspace.facilityAnalyses().length
        + (this.workspace.account()?.isSingleFacilityCompany ? 0 : this.workspace.accountAnalyses().length),
    };
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

}
