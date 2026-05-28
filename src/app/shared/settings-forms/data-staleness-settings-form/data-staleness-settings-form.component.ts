import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormBuilder } from '@angular/forms';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DataStalenessSettings } from 'src/app/models/idbModels/accountAndFacility';
import {
    DATA_STALENESS_OPTIONS,
    DataStalenessMonths,
    DEFAULT_DATA_STALENESS_MONTHS
} from 'src/app/calculations/status-check-calculations/statusCheckModels';

@Component({
    selector: 'app-data-staleness-settings-form',
    templateUrl: './data-staleness-settings-form.component.html',
    styleUrls: ['./data-staleness-settings-form.component.css'],
    standalone: false
})
export class DataStalenessSettingsFormComponent implements OnInit, OnDestroy {

    @Input() inAccount: boolean = true;

    form: FormGroup;
    stalenessOptions = DATA_STALENESS_OPTIONS;

    selectedAccountSub: Subscription;
    selectedFacilitySub: Subscription;
    selectedAccount: IdbAccount;
    selectedFacility: IdbFacility;
    isFormChange: boolean = false;

    constructor(
        private accountDbService: AccountdbService,
        private facilityDbService: FacilitydbService,
        private formBuilder: FormBuilder
    ) { }

    ngOnInit(): void {
        this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
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
            this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
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
            this.selectedAccount.dataStalenessSettings = settings;
            let updatedAccount: IdbAccount = await firstValueFrom(
                this.accountDbService.updateWithObservable(this.selectedAccount)
            );
            let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
            this.accountDbService.selectedAccount.next(updatedAccount);
            this.accountDbService.allAccounts.next(allAccounts);
        } else {
            this.selectedFacility.dataStalenessSettings = settings;
            await firstValueFrom(this.facilityDbService.updateWithObservable(this.selectedFacility));
            let accountFacilities: Array<IdbFacility> = await firstValueFrom(
                this.facilityDbService.getAllByIndexRange('accountId', this.selectedFacility.accountId)
            );
            this.facilityDbService.accountFacilities.next(accountFacilities);
            this.facilityDbService.selectedFacility.next(this.selectedFacility);
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
