import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { FacilityClassifications } from '@data/models/constantsAndTypes';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { Countries } from 'src/app/shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { SettingsFormsService } from '@v0/shared/settings-forms/settings-forms.service';
import { P1RouteFacade } from '../../../../p1-route.facade';

@Component({
  selector: 'app-p1-create-facility-drawer',
  templateUrl: './create-facility-drawer.component.html',
  styleUrls: [
    '../../../account-settings-page/account-settings-page.component.css',
    './create-facility-drawer.component.css'
  ],
  standalone: false
})
export class P1CreateFacilityDrawerComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly router = inject(Router);
  private readonly settingsForms = inject(SettingsFormsService);
  private readonly facade = inject(P1RouteFacade);

  readonly countries = Countries;
  readonly firstNaicsList = FirstNaicsList;
  readonly facilityClassifications = FacilityClassifications;

  readonly profileForm: FormGroup = (() => {
    const account = this.workspace.account();
    const facility = account ? getNewIdbFacility(account) : getNewIdbFacility({ guid: '' } as any);
    const form = this.settingsForms.getGeneralInformationForm(facility);
    form.addControl('classification', new FormControl(facility.classification ?? 'Manufacturing'));
    return form;
  })();

  isCreating = false;
  createError = '';

  get facilityNameInvalid(): boolean {
    const nameControl = this.profileForm.controls['name'];
    return nameControl.hasError('required') && (nameControl.touched || nameControl.dirty);
  }

  close(): void {
    if (this.isCreating) {
      return;
    }
    this.closed.emit();
  }

  secondNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? SecondNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  thirdNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? ThirdNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  checkNAICS(): void {
    const naics1 = this.profileForm.controls['naics1'].value;
    const naics2 = this.profileForm.controls['naics2'].value;
    const naics3 = this.profileForm.controls['naics3'].value;
    if (naics2 && !this.secondNaicsOptions(naics1).some(item => item.code === naics2)) {
      this.profileForm.controls['naics2'].patchValue(null);
      this.profileForm.controls['naics3'].patchValue(null);
    }
    if (naics3 && !this.thirdNaicsOptions(this.profileForm.controls['naics2'].value).some(item => item.code === naics3)) {
      this.profileForm.controls['naics3'].patchValue(null);
    }
  }

  formatPhone(event: Event): void {
    if (this.profileForm.controls['country'].value === 'US') {
      let input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
      if (input.length > 3 && input.length <= 6) {
        input = input.replace(/(\d{3})(\d+)/, '$1-$2');
      } else if (input.length > 6) {
        input = input.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
      }
      this.profileForm.controls['contactPhone'].setValue(input.substring(0, 12), { emitEvent: false });
    }
  }

  async createFacility(): Promise<void> {
    if (this.isCreating) {
      return;
    }
    this.createError = '';
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const account = this.workspace.account();
    if (!account) {
      this.createError = 'Facility could not be created. Please try again.';
      return;
    }

    this.isCreating = true;
    try {
      let facility = getNewIdbFacility(account);
      facility = this.settingsForms.updateFacilityFromGeneralInformationForm(this.profileForm, facility);
      facility.classification = this.profileForm.controls['classification'].value;

      const result = await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'add', entityGuid: facility.guid, label: 'Adding facility' },
        () => this.facilityHandler.add(
          facility,
          account.guid,
          this.workspace.accountAnalyses(),
          this.workspace.accountReports()
        )
      );

      await this.router.navigate([
        '/p1',
        'workspace',
        'facility',
        result.value.facility.guid,
        'settings',
        'profile',
        this.facade.activePanelTab() || 'help'
      ]);
    } catch (error) {
      console.warn('P1 prototype could not create a facility.', error);
      this.createError = 'Facility could not be created. Please try again.';
      this.isCreating = false;
    }
  }
}
