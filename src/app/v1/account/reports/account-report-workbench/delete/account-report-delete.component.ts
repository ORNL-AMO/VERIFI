import { TemplatePortal } from '@angular/cdk/portal';
import { Component, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, effect, inject, untracked } from '@angular/core';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountReportDeleteService } from './account-report-delete.service';

@Component({ selector: 'app-account-report-delete', standalone: false,
  templateUrl: './account-report-delete.component.html', styleUrls: ['./account-report-delete.component.css'] })
export class AccountReportDeleteComponent implements OnDestroy {
  readonly deletion = inject(AccountReportDeleteService);
  private readonly modal = inject(ModalPortalService);
  private readonly container = inject(ViewContainerRef);
  @ViewChild('deleteConfirmation', { static: true }) private confirmation!: TemplateRef<unknown>;
  private portal?: TemplatePortal;

  constructor() {
    effect(() => {
      const candidate = this.deletion.candidate();
      untracked(() => {
        this.hide();
        if (candidate) { this.portal = new TemplatePortal(this.confirmation, this.container); this.modal.show(this.portal); }
      });
    });
  }

  private hide(): void {
    if (this.portal && this.modal.activePortal() === this.portal) this.modal.hide();
    this.portal = undefined;
  }
  ngOnDestroy(): void { this.hide(); this.deletion.cancel(); }
}
