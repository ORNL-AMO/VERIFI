import {
  Component, DestroyRef, Injector, TemplateRef, ViewChild, ViewContainerRef,
  afterNextRender, effect, inject, input, untracked
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TemplatePortal } from '@angular/cdk/portal';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { InventoryChartDockComponent } from '@app/v1/shared/charts/inventory-chart-dock/inventory-chart-dock.component';
import { InventoryChartSheetComponent } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.component';
import { InventorySelectionController } from '../selection/inventory-selection.controller';
import { InventoryChartController } from '../charts/inventory-chart.controller';

/** The tools view owns its portals and focus; the routed inventory owns its controllers. */
@Component({
  selector: 'app-inventory-tools',
  standalone: true,
  imports: [ReactiveFormsModule, InventoryChartDockComponent, InventoryChartSheetComponent, ConfirmationDialogComponent],
  templateUrl: './inventory-tools.component.html',
  styleUrls: ['./inventory-tools.component.css']
})
export class InventoryToolsComponent {
  readonly selection = input.required<InventorySelectionController>();
  readonly chart = input.required<InventoryChartController>();
  readonly showSelectionToggle = input(true);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly portal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('chartPanel') private chartPanel!: TemplateRef<unknown>;
  @ViewChild('confirmation') private confirmation!: TemplateRef<unknown>;
  private activePortal: TemplatePortal<unknown> | undefined;
  private portalKind: 'chart' | 'review' | undefined;
  private portalContext = '';
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const active = this.portal.activePortal();
      untracked(() => {
        if (this.activePortal && active !== this.activePortal) {
          this.activePortal = undefined;
          this.portalKind = undefined;
          this.chart().close();
          this.selection().abandonReview();
        }
      });
    });
    effect(() => {
      const review = this.selection().review();
      const context = this.selection().contextKey();
      untracked(() => {
        if (this.portalKind === 'review' && !review) {
          this.hidePortal(this.portalContext === context);
        }
      });
    });
    this.destroyRef.onDestroy(() => {
      this.chart().close();
      this.selection().abandonReview();
      this.hidePortal(false);
    });
  }

  openCharts(): void {
    if (this.chart().open()) {
      return;
    }
    this.chart().show();
    this.showPortal(this.chartPanel, 'chart');
  }

  closeCharts(): void {
    this.chart().close();
    this.hidePortal();
  }

  requestDelete(): void {
    if (!this.selection().requestDelete()) {
      return;
    }
    this.chart().close();
    this.showPortal(this.confirmation, 'review');
  }

  cancelDelete(): void {
    if (this.selection().cancelDelete()) {
      this.hidePortal();
    }
  }

  async confirmDelete(): Promise<void> {
    const context = this.selection().contextKey();
    const completed = await this.selection().confirmDelete();
    if (completed && !this.destroyRef.destroyed && this.selection().contextKey() === context) {
      this.hidePortal();
    }
  }

  private showPortal(template: TemplateRef<unknown>, kind: 'chart' | 'review'): void {
    this.opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.activePortal = new TemplatePortal(template, this.container);
    this.portalKind = kind;
    this.portalContext = this.selection().contextKey();
    this.portal.show(this.activePortal, { blockWorkspace: kind === 'chart' });
  }
  private hidePortal(restoreFocus = true): void {
    if (this.activePortal && this.portal.activePortal() === this.activePortal) {
      this.portal.hide();
      const opener = this.opener;
      if (restoreFocus && opener?.isConnected && !this.destroyRef.destroyed) {
        const context = this.selection().contextKey();
        afterNextRender(() => {
          if (!this.destroyRef.destroyed && this.selection().contextKey() === context &&
            !this.portal.activePortal() && opener.isConnected) {
            opener.focus();
          }
        }, { injector: this.injector });
      }
    }
    this.activePortal = undefined;
    this.portalKind = undefined;
  }
}
