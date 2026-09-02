import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FacilityClassifications } from '@data/models/constantsAndTypes';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { Countries } from '@shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from '@shared/form-data/naics-data';
import { SettingsFormService } from '@shared/settings-forms/settings-form.service';
import { WorkspaceNavigationService } from '../../shell/workspace-navigation.service';
import { PortfolioFacilityDraft, PortfolioFacilityService } from '../portfolio/portfolio-facility.service';

@Component({
  selector: 'app-create-portfolio-facility-drawer',
  templateUrl: './create-facility-drawer.component.html',
  styleUrls: ['./create-facility-drawer.component.css'],
  standalone: false
})
export class CreateFacilityDrawerComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly portfolioFacilities = inject(PortfolioFacilityService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly router = inject(Router);
  private readonly settingsForms = inject(SettingsFormService);

  readonly countries = Countries;
  readonly firstNaicsList = FirstNaicsList;
  readonly facilityClassifications = FacilityClassifications;
  readonly form = this.buildForm();

  showProfileDetails = false;
  isCreating = false;
  createError = '';

  get facilityNameInvalid(): boolean {
    const control = this.form.controls['name'];
    return control.invalid && (control.touched || control.dirty);
  }

  get canCreateFacility(): boolean {
    return !this.isCreating && this.form.valid && String(this.form.controls['name'].value || '').trim().length > 0;
  }

  close(): void {
    if (!this.isCreating) {
      this.closed.emit();
    }
  }

  toggleProfileDetails(): void {
    this.showProfileDetails = !this.showProfileDetails;
  }

  secondNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? SecondNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  thirdNaicsOptions(parentCode: string | undefined): NAICS[] {
    return parentCode ? ThirdNaicsList.filter(item => item.matchNum === parentCode) : [];
  }

  checkNAICS(): void {
    const naics1 = this.form.controls['naics1'].value;
    const naics2 = this.form.controls['naics2'].value;
    const naics3 = this.form.controls['naics3'].value;
    if (naics2 && !this.secondNaicsOptions(naics1).some(item => item.code === naics2)) {
      this.form.controls['naics2'].patchValue(null);
      this.form.controls['naics3'].patchValue(null);
    }
    if (naics3 && !this.thirdNaicsOptions(this.form.controls['naics2'].value).some(item => item.code === naics3)) {
      this.form.controls['naics3'].patchValue(null);
    }
  }

  formatPhone(event: Event): void {
    if (this.form.controls['country'].value === 'US') {
      let input = (event.target as HTMLInputElement).value.replace(/\D/g, '');
      if (input.length > 3 && input.length <= 6) {
        input = input.replace(/(\d{3})(\d+)/, '$1-$2');
      } else if (input.length > 6) {
        input = input.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
      }
      this.form.controls['contactPhone'].setValue(input.substring(0, 12), { emitEvent: false });
    }
  }

  async createFacility(): Promise<void> {
    if (this.isCreating) {
      return;
    }
    this.createError = '';
    this.normalizeRequiredText();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isCreating = true;
    try {
      const facility = await this.portfolioFacilities.createFacility(this.buildDraft());
      await this.router.navigate(this.navigation.facilitySettingsRoute(facility.guid));
      this.closed.emit();
    } catch (error) {
      console.warn('v1 portfolio could not create a facility.', error);
      this.createError = 'Facility could not be created. Please try again.';
      this.isCreating = false;
    }
  }

  private buildForm(): FormGroup {
    const account = this.navigation.account();
    const facility = account ? getNewIdbFacility(account) : getNewIdbFacility({ guid: '' } as any);
    const form = this.settingsForms.getGeneralInformationForm(facility);
    form.addControl('classification', new FormControl(facility.classification || 'Manufacturing'));
    form.controls['name'].setValue('');
    form.controls['name'].addValidators([Validators.required, Validators.maxLength(42)]);
    return form;
  }

  private buildDraft(): PortfolioFacilityDraft {
    return {
      name: String(this.form.controls['name'].value || ''),
      includeProfileDetails: this.showProfileDetails,
      country: this.form.controls['country'].value,
      city: this.form.controls['city'].value,
      state: this.form.controls['state'].value,
      zip: this.form.controls['zip'].value,
      address: this.form.controls['address'].value,
      naics1: this.form.controls['naics1'].value,
      naics2: this.form.controls['naics2'].value,
      naics3: this.form.controls['naics3'].value,
      size: this.form.controls['size'].value,
      notes: this.form.controls['notes'].value,
      color: this.form.controls['color'].value,
      contactName: this.form.controls['contactName'].value,
      contactEmail: this.form.controls['contactEmail'].value,
      contactPhone: this.form.controls['contactPhone'].value,
      classification: this.form.controls['classification'].value
    };
  }

  private normalizeRequiredText(): void {
    const nameControl = this.form.controls['name'];
    const trimmedName = String(nameControl.value || '').trim();
    if (nameControl.value !== trimmedName) {
      nameControl.setValue(trimmedName, { emitEvent: false });
    }
  }
}
