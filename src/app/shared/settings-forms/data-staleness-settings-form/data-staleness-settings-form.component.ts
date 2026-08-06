import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, OnInit, OnDestroy, Input, inject } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DataStalenessSettings } from 'src/app/models/idbModels/accountAndFacility';
import { DATA_STALENESS_OPTIONS, DataStalenessMonths, DEFAULT_DATA_STALENESS_MONTHS } from 'src/app/calculations/status-check-calculations/statusCheckModels';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
    selector: 'app-data-staleness-settings-form',
    templateUrl: './data-staleness-settings-form.component.html',
    styleUrls: ['./data-staleness-settings-form.component.css'],
    standalone: false
})
export class DataStalenessSettingsFormComponent implements OnInit, OnDestroy {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);

    @Input() inAccount: boolean = true;

    form: FormGroup;
    stalenessOptions = DATA_STALENESS_OPTIONS;

    selectedAccountSub: Subscription;
    selectedFacilitySub: Subscription;
    selectedAccount: IdbAccount;
    selectedFacility: IdbFacility;
    isFormChange: boolean = false;

    constructor(
      private formBuilder: FormBuilder,
      private dbChangesService: DbChangesService

    ) { }

    ngOnInit(): void {
        this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(account => {
            this.selectedAccount = account;
            if (this.inAccount && account) {
                if (!this.isFormChange) {
                    this.initForm(account.dataStalenessSettings);
                } else {
                    this.isFormChange = false;
                }
            }
        });

        if (!this.inAccount) {
            this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(facility => {
                this.selectedFacility = facility;
                if (facility) {
                    if (!this.isFormChange) {
                        this.initForm(facility.dataStalenessSettings, true);
                    } else {
                        this.isFormChange = false;
                    }
                }
            });
        }
    }

    ngOnDestroy(): void {
        this.selectedAccountSub?.unsubscribe();
        this.selectedFacilitySub?.unsubscribe();
    }

    private initForm(settings: DataStalenessSettings | undefined, isFacility: boolean = false): void {
        const defaultSettings: DataStalenessSettings = {
            enabled: true,
            thresholdMonths: DEFAULT_DATA_STALENESS_MONTHS,
            useAccountSettings: isFacility ? true : undefined
        };

        const currentSettings = settings || defaultSettings;

        this.form = this.formBuilder.group({
            enabled: [currentSettings.enabled],
            thresholdMonths: [currentSettings.thresholdMonths],
            useAccountSettings: [currentSettings.useAccountSettings]
        });
    }

    async saveChanges(): Promise<void> {
        this.isFormChange = true;

        const settings: DataStalenessSettings = {
            enabled: this.form.controls['enabled'].value,
            thresholdMonths: this.form.controls['thresholdMonths'].value as DataStalenessMonths,
            useAccountSettings: this.inAccount ? undefined : this.form.controls['useAccountSettings'].value
        };

        if (this.inAccount) {
            await this.dbChangesService.updateAccount({
                ...this.selectedAccount,
                dataStalenessSettings: settings
            });
            await this.applicationLifecycleService.refreshAccountCatalog();
        } else {
            await this.dbChangesService.updateFacility({
                ...this.selectedFacility,
                dataStalenessSettings: settings
            });
        }
    }

    onUseAccountSettingsChange(): void {
        if (this.form.controls['useAccountSettings'].value && this.selectedAccount?.dataStalenessSettings) {
            // When switching to use account settings, update the form to reflect account values
            this.form.controls['enabled'].setValue(this.selectedAccount.dataStalenessSettings.enabled);
            this.form.controls['thresholdMonths'].setValue(this.selectedAccount.dataStalenessSettings.thresholdMonths);
        }
        this.saveChanges();
    }

    get isUsingAccountSettings(): boolean {
        return !this.inAccount && this.form?.controls['useAccountSettings']?.value === true;
    }

    get effectiveThresholdMonths(): number {
        if (this.isUsingAccountSettings && this.selectedAccount?.dataStalenessSettings) {
            return this.selectedAccount.dataStalenessSettings.thresholdMonths;
        }
        return this.form?.controls['thresholdMonths']?.value || DEFAULT_DATA_STALENESS_MONTHS;
    }

    get effectiveEnabled(): boolean {
        if (this.isUsingAccountSettings && this.selectedAccount?.dataStalenessSettings) {
            return this.selectedAccount.dataStalenessSettings.enabled;
        }
        return this.form?.controls['enabled']?.value ?? true;
    }
}
