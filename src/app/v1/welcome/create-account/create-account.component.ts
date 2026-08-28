import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from '@data/models/idbModels/facility';
import { DrawerFocusTrapDirective } from '../shared/drawer-focus-trap.directive';
import { CREATE_ACCOUNT_CHOICES, CreateAccountPath, CreateAccountResult } from '../welcome.models';

@Component({
  selector: 'app-create-account-panel',
  templateUrl: './create-account.component.html',
  styleUrls: ['./create-account.component.css'],
  imports: [FormsModule, DrawerFocusTrapDirective],
  standalone: true
})
export class CreateAccountComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<CreateAccountResult>();

  private readonly lifecycle = inject(ApplicationLifecycleService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly facilityHandler = inject(FacilityCommandHandler);

  readonly choices = CREATE_ACCOUNT_CHOICES;

  readonly createForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(42)]
    })
  });

  selectedPath: CreateAccountPath = 'singleFacility';
  isCreating = false;
  createError = '';
  pendingStarterAccount?: IdbAccount;

  get accountNameInvalid(): boolean {
    const nameControl = this.createForm.controls.name;
    return nameControl.invalid && (nameControl.touched || nameControl.dirty);
  }

  get hasPendingStarterAccount(): boolean {
    return !!this.pendingStarterAccount;
  }

  get submitLabel(): string {
    if (this.hasPendingStarterAccount) {
      return 'Retry starter site';
    }
    if (this.selectedPath === 'portfolio') {
      return 'Create portfolio';
    }
    return 'Create workspace';
  }

  close(): void {
    if (!this.isCreating) {
      this.closed.emit();
    }
  }

  setPath(path: CreateAccountPath): void {
    if (!this.isCreating && !this.pendingStarterAccount) {
      this.selectedPath = path;
    }
  }

  setAccountName(event: Event): void {
    this.createForm.controls.name.setValue((event.target as HTMLInputElement).value);
  }

  openCreatedAccount(): void {
    if (this.pendingStarterAccount) {
      this.completed.emit({ path: this.selectedPath, account: this.pendingStarterAccount });
    }
  }

  async createAccount(): Promise<void> {
    if (this.isCreating) {
      return;
    }

    this.createError = '';
    const trimmedName = this.createForm.controls.name.value.trim();
    if (this.createForm.invalid || !trimmedName) {
      this.createForm.controls.name.setValue(trimmedName);
      this.createForm.markAllAsTouched();
      return;
    }

    this.isCreating = true;
    try {
      const result = await this.createSelectedWorkspace(trimmedName);
      this.completed.emit(result);
    } catch (error) {
      console.warn('v1 welcome could not create an account.', error);
      this.createError = this.pendingStarterAccount
        ? 'Workspace was created, but the starter site could not be created. Try again, or open the workspace and add details later.'
        : 'Workspace could not be created. Please try again.';
    } finally {
      this.isCreating = false;
    }
  }

  private async createSelectedWorkspace(name: string): Promise<CreateAccountResult> {
    const shouldCreateStarterFacility = this.selectedPath !== 'portfolio';
    const account = this.pendingStarterAccount || await this.createAccountRecord(name, shouldCreateStarterFacility);
    this.pendingStarterAccount = shouldCreateStarterFacility ? account : undefined;

    if (!shouldCreateStarterFacility) {
      return { path: this.selectedPath, account };
    }

    const facility = await this.createStarterFacility(account);
    this.pendingStarterAccount = undefined;
    return { path: this.selectedPath, account, facility };
  }

  private async createAccountRecord(name: string, isSingleFacilityCompany: boolean): Promise<IdbAccount> {
    const account = {
      ...getNewIdbAccount(),
      name,
      isSingleFacilityCompany
    };
    return this.lifecycle.createAccount(account);
  }

  private async createStarterFacility(account: IdbAccount): Promise<IdbFacility> {
    const facility: IdbFacility = {
      ...getNewIdbFacility(account),
      name: account.name
    };
    const result = await this.commandBoundary.execute(
      {
        entityKind: 'facility',
        changeKind: 'add',
        entityGuid: facility.guid,
        label: 'Adding starter site',
        notification: { suppressSuccessToast: true }
      },
      () => this.facilityHandler.add(
        facility,
        account.guid,
        this.workspace.accountAnalyses(),
        this.workspace.accountReports()
      )
    );
    return result.value.facility;
  }
}
