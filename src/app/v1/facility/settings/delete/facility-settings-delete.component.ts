import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { FACILITY_DELETION_MESSAGES } from '@data/indexedDB/facility-deletion.config';
import { NotificationService } from '../../../shared/notifications/notification.service';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

@Component({
  selector: 'app-facility-settings-delete',
  templateUrl: './facility-settings-delete.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class FacilitySettingsDeleteComponent extends FacilitySettingsDetailBase {
  private readonly loadingService = inject(LoadingService);
  private readonly notifications = inject(NotificationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);

  readonly isSingleFacilityAccount = computed(() => !!this.account()?.isSingleFacilityCompany);

  @ViewChild('deleteConfirmModal') private readonly deleteConfirmModal!: TemplateRef<unknown>;

  showDeleteConfirm = false;
  isDeleting = false;

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.showDeleteConfirm = false;
    this.modalPortal.hide();
  }

  openDeleteConfirm(): void {
    if (!this.account() || !this.facility() || !this.canWrite() || this.isDeleting) {
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

  async confirmDelete(): Promise<void> {
    if (this.isSingleFacilityAccount()) {
      await this.confirmDeleteAccount();
      return;
    }
    await this.confirmDeleteFacility();
  }

  private async confirmDeleteAccount(): Promise<void> {
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
          notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update({ ...account, deleteAccount: true }, account.guid)
      );
      await this.lifecycle.handleMarkedAccountDeletion(account.guid);
    });
    this.isDeleting = false;

    if (this.saveState === 'error') {
      return;
    }
    this.notifications.success('Account deleted', { message: account.name });
    const nextAccount = this.account();
    if (nextAccount?.guid) {
      await this.navigation.openAccount(nextAccount.guid);
      return;
    }
    this.navigation.showWelcome();
  }

  private async confirmDeleteFacility(): Promise<void> {
    const account = this.account();
    const facility = this.facility();
    if (!account || !facility || !this.canWrite() || this.isDeleting) {
      return;
    }

    this.showDeleteConfirm = false;
    this.modalPortal.hide();
    this.isDeleting = true;
    this.loadingService.clearLoadingMessages();
    FACILITY_DELETION_MESSAGES.forEach(message => this.loadingService.addLoadingMessage(message));
    this.loadingService.setCurrentLoadingIndex(0);
    this.loadingService.setContext(undefined);
    this.loadingService.setTitle('Deleting Facility');
    this.loadingService.setLoadingComplete(false);

    await this.runSave('Deleting facility', async () => {
      await this.commandBoundary.execute(
        {
          entityKind: 'facility',
          changeKind: 'delete',
          entityGuid: facility.guid,
          label: 'Deleting facility',
          notification: { entityName: facility.name }
        },
        () => this.facilityHandler.delete(facility, account.guid, phase => {
          this.loadingService.setCurrentLoadingIndex(phase.index);
        })
      );
      this.loadingService.setLoadingComplete(true);
    });
    this.isDeleting = false;

    if (this.saveState === 'error') {
      this.loadingService.clearLoadingMessages();
      this.loadingService.setLoadingComplete(false);
      this.loadingService.setTitle('');
      this.loadingService.setContext(undefined);
      return;
    }

    const nextFacility = this.facilities().find(item => item.guid !== facility.guid);
    if (nextFacility?.guid) {
      this.navigation.setFacility(nextFacility.guid);
      return;
    }
    await this.router.navigate(this.navigation.accountRoute(account.guid));
  }
}
