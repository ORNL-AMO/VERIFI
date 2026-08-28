import { TemplatePortal } from '@angular/cdk/portal';
import { Component, TemplateRef, ViewChild, ViewContainerRef, computed, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { FacilitySettingsDetailBase } from '../facility-settings-detail.base';

interface PortfolioTransitionResult {
  readonly facility?: IdbFacility;
}

@Component({
  selector: 'app-portfolio-transition-settings',
  templateUrl: './portfolio-transition-settings.component.html',
  host: { style: 'display: block;' },
  standalone: false
})
export class PortfolioTransitionSettingsComponent extends FacilitySettingsDetailBase {
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('portfolioConfirmModal') private readonly portfolioConfirmModal!: TemplateRef<unknown>;

  readonly form = new FormGroup({
    facilityName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required]
    })
  });
  readonly isSingleFacilityAccount = computed(() => this.account()?.isSingleFacilityCompany === true);
  readonly facilityCount = computed(() => this.facilities().length);
  readonly shouldAddFacility = computed(() => this.isSingleFacilityAccount() && this.facilityCount() <= 1);
  readonly hasMultipleFacilityRecovery = computed(() => this.isSingleFacilityAccount() && this.facilityCount() > 1);
  readonly portfolioModeReady = computed(() => !!this.account() && !this.isSingleFacilityAccount());

  showConfirm = false;
  isConverting = false;
  completedFacility?: IdbFacility;

  get facilityNameInvalid(): boolean {
    const control = this.form.controls.facilityName;
    return control.invalid && (control.touched || control.dirty);
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.showConfirm = false;
    this.modalPortal.hide();
  }

  openConversionConfirm(): void {
    if (!this.account() || !this.isSingleFacilityAccount() || !this.canWrite() || this.isConverting) {
      return;
    }
    this.saveError = '';
    if (this.shouldAddFacility()) {
      this.normalizeFacilityName();
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
    }
    this.showConfirm = true;
    this.modalPortal.show(new TemplatePortal(this.portfolioConfirmModal, this.viewContainerRef));
  }

  cancelConversionConfirm(): void {
    if (!this.isConverting) {
      this.showConfirm = false;
      this.modalPortal.hide();
    }
  }

  async confirmConversion(): Promise<void> {
    const account = this.account();
    if (!account || !this.isSingleFacilityAccount() || !this.canWrite() || this.isConverting) {
      return;
    }

    const addFacility = this.shouldAddFacility();
    if (addFacility) {
      this.normalizeFacilityName();
      if (this.form.invalid) {
        this.form.markAllAsTouched();
        return;
      }
    }

    const newFacilityName = this.form.controls.facilityName.value;
    this.showConfirm = false;
    this.modalPortal.hide();
    this.isConverting = true;
    this.completedFacility = undefined;

    await this.runSave('Converting to portfolio', async () => {
      const result = await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'update',
          entityGuid: account.guid,
          label: 'Converting to portfolio',
          publication: { mode: 'reload' }
        },
        async (): Promise<PortfolioTransitionResult> => {
          let addedFacility: IdbFacility | undefined;
          if (addFacility) {
            const facility: IdbFacility = {
              ...getNewIdbFacility(account),
              name: newFacilityName
            };
            const addResult = await this.facilityHandler.add(
              facility,
              account.guid,
              this.workspace.accountAnalyses(),
              this.workspace.accountReports()
            );
            addedFacility = addResult.facility;
          }
          await this.accountHandler.update({ ...structuredClone(account), isSingleFacilityCompany: false }, account.guid);
          return { facility: addedFacility };
        }
      );
      this.completedFacility = result.value.facility;
      await this.lifecycle.refreshAccountCatalog();
      if (addFacility && this.completedFacility?.guid) {
        void this.router.navigate(this.navigation.facilitySettingsRoute(this.completedFacility.guid));
      }
    });
    this.isConverting = false;
  }

  openAccountWorkspace(): void {
    const account = this.account();
    if (account?.guid) {
      void this.navigation.openAccount(account.guid);
    }
  }

  openCompletedFacility(): void {
    if (this.completedFacility?.guid) {
      this.navigation.setFacility(this.completedFacility.guid);
    }
  }

  private normalizeFacilityName(): void {
    const control = this.form.controls.facilityName;
    const trimmedName = control.value.trim();
    if (control.value !== trimmedName) {
      control.setValue(trimmedName, { emitEvent: false });
    }
  }
}
