import { TemplatePortal } from '@angular/cdk/portal';
import { Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { ConfirmationDialogComponent } from '@app/v1/shared/a11y/confirmation-dialog.component';
import { IconComponent } from '@app/v1/shared/icons/icon.component';
import { DATA_STALENESS_OPTIONS } from '@app/v1/status/status.settings';
import { DataValidationSettingsGroup } from '@shared/settings-forms/data-validation-settings';
import { DataValidationSettingsEditor } from '../data-validation-settings-editor.service';

@Component({
  selector: 'app-data-validation-settings-panel',
  templateUrl: './data-validation-settings-panel.component.html',
  styleUrls: ['./data-validation-settings-panel.component.css'],
  imports: [ReactiveFormsModule, IconComponent, ConfirmationDialogComponent]
})
export class DataValidationSettingsPanelComponent implements OnDestroy {
  @Input({ required: true }) editor!: DataValidationSettingsEditor;
  @Input() facilityContext = false;
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainer = inject(ViewContainerRef);
  @ViewChild('accountUpdateConfirm') private readonly confirmation!: TemplateRef<unknown>;
  readonly confirmGroup = signal<DataValidationSettingsGroup>('staleness');
  readonly stalenessOptions = DATA_STALENESS_OPTIONS;

  openAccountUpdateConfirm(group: DataValidationSettingsGroup): void {
    if (!this.editor.canWrite()) return;
    this.confirmGroup.set(group);
    this.modalPortal.show(new TemplatePortal(this.confirmation, this.viewContainer));
  }

  cancelAccountUpdateConfirm(): void { this.modalPortal.hide(); }

  confirmAccountSettingsUpdate(): void {
    this.modalPortal.hide();
    this.editor.useAccountSettings(this.confirmGroup());
  }

  ngOnDestroy(): void { this.modalPortal.hide(); }
}
