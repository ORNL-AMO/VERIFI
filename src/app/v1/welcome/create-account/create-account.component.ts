import { Component, EventEmitter, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { getNewIdbAccount, IdbAccount } from '@data/models/idbModels/account';
import { DrawerFocusTrapDirective } from '../shared/drawer-focus-trap.directive';

@Component({
  selector: 'app-create-account-panel',
  templateUrl: './create-account.component.html',
  styleUrls: ['./create-account.component.css'],
  imports: [FormsModule, DrawerFocusTrapDirective],
  standalone: true
})
export class CreateAccountComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<IdbAccount>();

  private readonly lifecycle = inject(ApplicationLifecycleService);

  readonly createForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(42)]
    })
  });

  isCreating = false;
  createError = '';

  get accountNameInvalid(): boolean {
    const nameControl = this.createForm.controls.name;
    return nameControl.invalid && (nameControl.touched || nameControl.dirty);
  }

  close(): void {
    if (!this.isCreating) {
      this.closed.emit();
    }
  }

  setAccountName(event: Event): void {
    this.createForm.controls.name.setValue((event.target as HTMLInputElement).value);
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
      const account = {
        ...getNewIdbAccount(),
        name: trimmedName
      };
      const createdAccount = await this.lifecycle.createAccount(account);
      this.completed.emit(createdAccount);
    } catch (error) {
      console.warn('v1 welcome could not create an account.', error);
      this.createError = 'Account could not be created. Please try again.';
    } finally {
      this.isCreating = false;
    }
  }
}
