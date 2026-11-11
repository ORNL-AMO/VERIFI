import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, effect, inject, untracked } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { LibraryLifecycle } from '../../library/lifecycle/library-lifecycle.service';
import { visualizationFamilyChoices } from '../../visualization-families';

@Component({ selector: 'app-visualization-creation', standalone: false,
  templateUrl: './creation-drawer.component.html', styleUrls: ['./creation-drawer.component.css', '../../../shared/creation-flow/creation-flow.css'] })
export class CreationComponent implements OnDestroy {
  readonly lifecycle = inject(LibraryLifecycle);
  readonly families = visualizationFamilyChoices();
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('deleteConfirmation', { static: true }) private deleteConfirmation!: TemplateRef<unknown>;
  @ViewChild('discardConfirmation', { static: true }) private discardConfirmation!: TemplateRef<unknown>;
  private portal?: TemplatePortal;
  constructor() {
    effect(() => {
      const confirmation = this.lifecycle.confirmation();
      untracked(() => {
        this.hide();
        if (confirmation) {
          this.portal = new TemplatePortal(confirmation === 'delete' ? this.deleteConfirmation : this.discardConfirmation, this.container);
          this.modal.show(this.portal, { blockWorkspace: true });
        }
      });
    });
  }
  private hide(): void { if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide(); this.portal = undefined; }
  ngOnDestroy(): void { this.hide(); }
}
