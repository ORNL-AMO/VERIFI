import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupFile } from '@data/models/backup-file';
import { IdbFacility } from '@data/models/idbModels/facility';
import { NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { EmailData, EmailVerifiBackupService } from '../email-verifi-backup.service';
import {
  collectSavedEmails,
  filterSavedEmails,
  isValidEmail,
  splitEmailEntry
} from './email-address-utils';

@Component({
  selector: 'app-email-data-modal',
  standalone: false,
  templateUrl: './email-data-modal.component.html',
  styleUrl: './email-data-modal.component.css',
})
export class EmailDataModalComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly formBuilder = inject(FormBuilder);

  @Input() isAccount?: boolean;
  @Input() facility?: IdbFacility;
  @Output() cancel = new EventEmitter<void>();

  emailForm: FormGroup;
  emailData: EmailData;
  modalHeader: string;
  savedEmails: string[] = [];
  receiverEntryControl = new FormControl('', {
    nonNullable: true,
    validators: [this.emailEntryValidator()]
  });

  constructor(
    private backupExportCoordinator: BackupExportCoordinator,
    private emailVerifiBackupService: EmailVerifiBackupService
  ) { }

  ngOnInit(): void {
    this.modalHeader = this.isAccount ? 'Account Backup' : 'Facility Backup';
    this.savedEmails = collectSavedEmails(
      this.accountWorkspaceStore.account(),
      this.accountWorkspaceStore.facilities()
    );
    this.emailForm = this.buildEmailForm();
  }

  buildEmailForm(): FormGroup {
    const accountName = this.accountWorkspaceStore.account()?.name;
    const defaultName = this.isAccount ? `${accountName}-backup` : `${this.facility?.name}-backup`;

    return this.formBuilder.group({
      senderEmail: ['', [Validators.required, Validators.email]],
      receiverEmails: [[], Validators.required],
      attachmentName: [defaultName, [Validators.required, this.attachmentNameValidator()]]
    });
  }

  emailEntryValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value?.trim()) {
        return null;
      }
      const emails = splitEmailEntry(control.value);
      return emails.some(email => !isValidEmail(email)) ? { invalidEmails: true } : null;
    };
  }

  attachmentNameValidator(): ValidatorFn {
    const regex = /^[a-zA-Z0-9._\- ()]+$/;
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }
      return regex.test(control.value) ? null : { invalidAttachmentName: true };
    };
  }

  searchSenderEmails = (text$: Observable<string>) =>
    text$.pipe(map(term => filterSavedEmails(this.savedEmails, term)));

  searchReceiverEmails = (text$: Observable<string>) =>
    text$.pipe(map(term => filterSavedEmails(this.savedEmails, term, this.receiverEmails)));

  selectReceiverEmail(event: NgbTypeaheadSelectItemEvent<string>): void {
    event.preventDefault();
    this.addReceiverEmails([event.item]);
    this.receiverEntryControl.setValue('');
  }

  addReceiverEntry(): void {
    this.receiverEntryControl.markAsTouched();
    if (this.receiverEntryControl.invalid) {
      return;
    }

    const emails = splitEmailEntry(this.receiverEntryControl.value);
    if (emails.length === 0) {
      return;
    }

    this.addReceiverEmails(emails);
    this.receiverEntryControl.setValue('');
  }

  handleReceiverKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
      event.preventDefault();
      this.addReceiverEntry();
      return;
    }

    if (event.key === 'Backspace' && !this.receiverEntryControl.value && this.receiverEmails.length > 0) {
      this.removeReceiverEmail(this.receiverEmails.length - 1);
    }
  }

  removeReceiverEmail(index: number): void {
    const nextEmails = this.receiverEmails.filter((_, emailIndex) => emailIndex !== index);
    this.emailForm.controls.receiverEmails.setValue(nextEmails);
    this.emailForm.controls.receiverEmails.markAsDirty();
    this.emailForm.controls.receiverEmails.markAsTouched();
  }

  get receiverEmails(): string[] {
    return this.emailForm?.controls.receiverEmails.value ?? [];
  }

  get canSend(): boolean {
    const senderValid = this.emailForm?.controls.senderEmail.valid;
    const attachmentValid = this.emailForm?.controls.attachmentName.valid;
    const hasReceiver = this.receiverEmails.length > 0
      || (!!this.receiverEntryControl.value.trim() && this.receiverEntryControl.valid);
    return !!senderValid && !!attachmentValid && hasReceiver && this.receiverEntryControl.valid;
  }

  async setEmailData(emailForm: FormGroup): Promise<void> {
    let attachedFile: BackupFile;
    if (this.isAccount) {
      const accountGuid = this.accountWorkspaceStore.account().guid;
      attachedFile = await this.backupExportCoordinator.buildAccountBackupByGuid(accountGuid);
    } else {
      attachedFile = await this.backupExportCoordinator.buildFacilityBackup(this.facility?.guid);
    }

    if (emailForm.valid && attachedFile) {
      this.emailData = {
        emailSender: emailForm.controls.senderEmail.value,
        emailTo: emailForm.controls.receiverEmails.value.join(','),
        fileName: emailForm.controls.attachmentName.value,
        attachment: attachedFile,
        isProduction: true
      };
    } else {
      this.emailData = undefined;
    }
  }

  async sendEmail(): Promise<void> {
    if (this.receiverEntryControl.value) {
      this.addReceiverEntry();
    }
    if (this.emailForm.invalid || this.receiverEntryControl.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    await this.setEmailData(this.emailForm);
    if (this.emailData) {
      this.emailVerifiBackupService.sendEmail(this.emailData);
    }
  }

  closeEmailModal(): void {
    this.cancel.emit();
  }

  private addReceiverEmails(emails: readonly string[]): void {
    const nextEmails = [...this.receiverEmails];
    const existing = new Set(nextEmails.map(email => email.toLocaleLowerCase()));

    emails.forEach(email => {
      const key = email.toLocaleLowerCase();
      if (!existing.has(key)) {
        nextEmails.push(email);
        existing.add(key);
      }
    });

    this.emailForm.controls.receiverEmails.setValue(nextEmails);
    this.emailForm.controls.receiverEmails.markAsDirty();
    this.emailForm.controls.receiverEmails.markAsTouched();
  }
}
