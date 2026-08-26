import { Component, TemplateRef, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { TemplatePortal } from '@angular/cdk/portal';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-delete',
  templateUrl: './account-settings-delete.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsDeleteComponent extends AccountSettingsDetailBase {
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('deleteConfirmModal') private readonly deleteConfirmModal!: TemplateRef<unknown>;

  showDeleteConfirm = false;
  isDeleting = false;

  openDeleteConfirm(): void {
    if (!this.account() || !this.canWrite() || this.isDeleting) {
      return;
    }
    this.saveError = '';
    this.showDeleteConfirm = true;
    this.modalPortal.show(new TemplatePortal(this.deleteConfirmModal, this.viewContainerRef));
  }

  cancelDeleteConfirm(): void {
    if (!this.isDeleting) {
      this.showDeleteConfirm = false;
      this.modalPortal.hide();
    }
  }

  async confirmDeleteAccount(): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite() || this.isDeleting) {
      return;
    }

    this.showDeleteConfirm = false;
    this.modalPortal.hide();
    this.isDeleting = true;
    await this.runSave('Deleting account', async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'delete',
          entityGuid: account.guid,
          label: 'Deleting account',
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update({ ...account, deleteAccount: true }, account.guid)
      );
      await this.lifecycle.handleMarkedAccountDeletion(account.guid);
    });
    this.isDeleting = false;

    const nextAccount = this.account();
    if (this.saveState === 'error') {
      return;
    }
    if (nextAccount?.guid) {
      await this.navigation.openAccount(nextAccount.guid);
      return;
    }
    this.navigation.showWelcome();
  }
}
