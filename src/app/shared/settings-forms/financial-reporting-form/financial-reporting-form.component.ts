import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { Component, OnInit, inject, Injector } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { SettingsFormsService } from '../settings-forms.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-financial-reporting-form',
  templateUrl: './financial-reporting-form.component.html',
  styleUrls: ['./financial-reporting-form.component.css'],
  standalone: false
})
export class FinancialReportingFormComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly accountHandler = inject(AccountCommandHandler);
  private readonly facilityHandler = inject(FacilityCommandHandler);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);

  form: FormGroup;
  months: Array<Month> = Months;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  isFormChange: boolean = false;
  constructor(private settingsFormsService: SettingsFormsService, private injector: Injector) { }

  ngOnInit(): void {
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(account => {
      this.selectedAccount = account;
      if (account) {
        if (this.isFormChange == false) {
          this.form = this.settingsFormsService.getFiscalYearForm(account);
        } else {
          this.isFormChange = false;
        }
      }
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
  }

  async saveChanges() {
    this.isFormChange = true;
    this.selectedAccount = this.settingsFormsService.updateAccountFromFiscalForm(this.form, this.selectedAccount);
    const account = this.selectedAccount;
    const activeAccountGuid = account.guid;
    const accountFacilities = this.accountWorkspaceStore.facilities().map(facility => ({
      ...facility,
      fiscalYear: account.fiscalYear,
      fiscalYearMonth: account.fiscalYearMonth,
      fiscalYearCalendarEnd: account.fiscalYearCalendarEnd
    }));
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: activeAccountGuid, label: 'Saving financial reporting settings' },
      async () => {
        const updatedAccount = await this.accountHandler.update(account, activeAccountGuid);
        for (const facility of accountFacilities) {
          await this.facilityHandler.update(facility, activeAccountGuid);
        }
        return updatedAccount;
      }
    );
    await this.applicationLifecycleService.refreshAccountCatalog();
  }
}
