import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { EmailData, EmailStatusCode, EmailVerifiBackupService } from '../email-verifi-backup.service';
import { AccountWorkspaceStore } from '@app/data/account-workspace/account-workspace.store';
import { BackupFile } from '@app/data/models/backup-file';
import { IdbFacility } from '@app/data/models/idbModels/facility';
import { BackupExportCoordinator } from '@app/data/backup/backup-export-coordinator.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-email-data-modal',
  standalone: false,
  templateUrl: './email-data-modal.component.html',
  styleUrl: './email-data-modal.component.css',
})
export class EmailDataModalComponent {

  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  @Input() isAccount?: boolean;
  @Input() facility?: IdbFacility;
  @Output() cancel = new EventEmitter<void>();

  private formBuilder: FormBuilder = inject(FormBuilder);
  emailForm: FormGroup;
  senderEmail: string;
  emailData: EmailData;
  modalHeader: string;

  constructor(
    private backupExportCoordinator: BackupExportCoordinator,
    private emailVerifiBackupService: EmailVerifiBackupService
  ) {}

  ngOnInit() {
    this.modalHeader = this.isAccount ? 'Account Backup' : 'Facility Backup';
    this.emailForm = this.buildEmailForm();
  }

  buildEmailForm(): FormGroup {
    console.log('facility:', this.facility);
    const accountName = this.accountWorkspaceStore.account()?.name;
    let defaultName: string;
    defaultName = this.isAccount ? `${accountName}-backup` : `${this.facility?.name}-backup`;

    return this.formBuilder.group({
      senderEmail: ['', [Validators.required, Validators.email]],
      receiverEmail: ['', [Validators.required, this.multipleEmailsValidator()]],
      attachmentName: [defaultName, [Validators.required, this.attachmentNameValidator()]]
    });
  }

  multipleEmailsValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) {
        return null;
      }
      const emails = control.value.split(/[, ]+/).map((email: string) => email.trim());
      const invalidEmails = emails.filter((email: string) => Validators.email(new FormControl(email)) !== null);
      return invalidEmails.length > 0 ? { invalidEmails: true } : null;
    };
  }

  attachmentNameValidator() {
    const regex = /^[a-zA-Z0-9._\- ()]+$/;
    return (control: AbstractControl) => {
      if (!control.value) {
        return null;
      }
      return regex.test(control.value) ? null : { invalidAttachmentName: true };
    };
  }

  async setEmailData(emailForm: FormGroup) {
    let attachedFile: BackupFile;
    if (this.isAccount) {
      const accountGuid = this.accountWorkspaceStore.account().guid;
      attachedFile = await this.backupExportCoordinator.buildAccountBackupByGuid(accountGuid);
    }
    else {
      attachedFile = await this.backupExportCoordinator.buildFacilityBackup(this.facility?.guid);
    }
    if (emailForm.valid && attachedFile) {
      this.emailData = {
        emailSender: emailForm.controls.senderEmail.value,
        emailTo: emailForm.controls.receiverEmail?.value?.replace(/[,\s]+$/, ''),
        fileName: emailForm.controls.attachmentName?.value,
        attachment: attachedFile,
        //isProduction: environment.production
        isProduction: true
      }
    }
    else {
      this.emailData = undefined;
    }
  }

  async sendEmail() {
    await this.setEmailData(this.emailForm);
    this.emailVerifiBackupService.sendEmail(this.emailData);
  }

  closeEmailModal() {
    this.cancel.emit();
  }
}
