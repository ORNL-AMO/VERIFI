import { TemplatePortal } from '@angular/cdk/portal';
import { Component, ElementRef, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, computed, inject, signal } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';

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
  private readonly element = inject(ElementRef<HTMLElement>);
  private headerResizeObserver?: ResizeObserver;
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

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

  readonly account = this.workspace.account;
  readonly canWrite = this.workspace.canWrite;
  readonly hasPending = this.workspace.hasPending;
  readonly activeContent = computed(() => this.navigation.activePortfolioTab() || 'facilities');
  readonly isFacilities = computed(() => this.activeContent() === 'facilities');
  readonly showUpload = computed(() => !['analyses', 'reports'].includes(this.activeContent()));
  readonly isCreateFacilityDrawerOpen = signal(false);

  ngOnDestroy(): void {
    this.headerResizeObserver?.disconnect();
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
