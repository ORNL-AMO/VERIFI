import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { skip, take } from 'rxjs';
import { ElectronService } from 'src/app/electron/electron.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterDataService } from '../../utility-meter-data.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { MeterCommandHandler } from 'src/app/account-workspace/handlers/meter-command-handler.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';

@Component({
  selector: 'app-edit-connect-bill',
  standalone: false,
  templateUrl: './edit-connect-bill.component.html',
  styleUrl: './edit-connect-bill.component.css'
})
export class EditConnectBillComponent {

  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;
  @Input()
  addOrEdit: 'add' | 'edit';

  savedUtilityFilePath: string;
  utilityFileDeleted: boolean = false;
  deletedPath: string;
  key: string;
  folderPath: string;
  folderError: boolean = false;
  meterDataToSave: IdbUtilityMeterData;

  constructor(
    private commandBoundary: WorkspaceCommandBoundary,
    private meterHandler: MeterCommandHandler,
    private utilityMeterDataService: UtilityMeterDataService,
    private electronService: ElectronService,
    private cd: ChangeDetectorRef,
    private accountWorkspaceStore: AccountWorkspaceStore) { }

  ngOnInit(): void {
    this.key = this.editMeterData.guid;
    this.electronService.getFilePath(this.key).subscribe(async path => {
      this.savedUtilityFilePath = path;
      if (path) {
        this.utilityFileDeleted = false;
        this.editMeterData.uploadedFilePath = path;
        if (this.editMeter.source == 'Electricity') {
          this.meterDataToSave = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm, this.editMeterData.uploadedFilePath);
        } else {
          this.meterDataToSave = this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm, this.editMeterData.uploadedFilePath);
        }
        if (this.addOrEdit == 'edit') {
          await this.commandBoundary.execute(
          { entityKind: 'meterData', changeKind: 'update', label: 'Update Bill File' ,
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meterData', upsert: [value] }] }) }},
          () => this.meterHandler.updateMeterData(this.meterDataToSave, this.accountWorkspaceStore.account()?.guid)
        );
        }
      }
      this.cd.detectChanges();
    });

    this.electronService.getDeletedFile(this.key).subscribe(async deleted => {
      this.utilityFileDeleted = deleted;
      this.deletedPath = this.savedUtilityFilePath;
      if (this.utilityFileDeleted) {
        if (this.editMeter.source == 'Electricity') {
          this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm, 'Deleted');
        } else {
          this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm, 'Deleted');
        }
        if (this.addOrEdit == 'edit') {
          await this.commandBoundary.execute(
          { entityKind: 'meterData', changeKind: 'update', label: 'Update Bill File' ,
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meterData', upsert: [value] }] }) }},
          () => this.meterHandler.updateMeterData(this.meterDataToSave, this.accountWorkspaceStore.account()?.guid)
        );
        }
      }
      this.cd.detectChanges();
    });

    this.electronService.getFolderPath().subscribe(path => {
      this.folderPath = path;
      this.cd.detectChanges();
    });
  }

  async uploadBill() {
    if (!this.folderPath) {
      this.folderError = true;
      return;
    }
    else {
      this.folderError = false;
      let date: string;
      if (this.editMeterData.year) {
        date = this.editMeterData.year + '-' + (this.editMeterData.month) + '-' + this.editMeterData.day;
      }

      await this.electronService.selectFile(this.key, this.folderPath, this.editMeterData.meterNumber, date);
      this.electronService.getFilePath(this.key).pipe(skip(1), take(1)).subscribe(async path => {
        if (path) {
          this.savedUtilityFilePath = path;
          this.editMeterData.uploadedFilePath = path;
          if (this.editMeter.source == 'Electricity') {
            this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm, this.editMeterData.uploadedFilePath);
          } else {
            this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm, this.editMeterData.uploadedFilePath);
          }
          if (this.addOrEdit == 'edit') {
            await this.commandBoundary.execute(
          { entityKind: 'meterData', changeKind: 'update', label: 'Update Bill File' ,
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meterData', upsert: [value] }] }) }},
          () => this.meterHandler.updateMeterData(this.meterDataToSave, this.accountWorkspaceStore.account()?.guid)
        );
          }
        }
        this.cd.detectChanges();
      });
    }
  }

  async openBillLocation() {
    this.electronService.checkUtilityFileExists(this.key, this.savedUtilityFilePath);
    this.electronService.getDeletedFile(this.key).pipe(
      skip(1),
      take(1)
    ).subscribe(async isDeleted => {
      if (!isDeleted) {
        this.electronService.openFileLocation(this.key);
      } else {
        if (this.editMeter.source == 'Electricity') {
          this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm, 'Deleted');
        } else {
          this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm, 'Deleted');
        }
        if (this.addOrEdit == 'edit') {
          await this.commandBoundary.execute(
          { entityKind: 'meterData', changeKind: 'update', label: 'Update Bill File' ,
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meterData', upsert: [value] }] }) }},
          () => this.meterHandler.updateMeterData(this.meterDataToSave, this.accountWorkspaceStore.account()?.guid)
        );
        }
        console.warn('File does not exist or has been deleted.');
      }
      this.cd.detectChanges();
    });
  }

  async disconnectBill() {
    if (this.savedUtilityFilePath) {
      this.electronService.disconnectBill(this.key);
      this.savedUtilityFilePath = undefined;
      this.utilityFileDeleted = true;
      if (this.editMeter.source == 'Electricity') {
        this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm, 'Deleted');
      } else {
        this.utilityMeterDataService.updateGeneralMeterDataFromForm(this.editMeterData, this.meterDataForm, 'Deleted');
      }
      if (this.addOrEdit == 'edit') {
        await this.commandBoundary.execute(
          { entityKind: 'meterData', changeKind: 'update', label: 'Update Bill File' ,
            publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'meterData', upsert: [value] }] }) }},
          () => this.meterHandler.updateMeterData(this.meterDataToSave, this.accountWorkspaceStore.account()?.guid)
        );
      }
      this.cd.detectChanges();
    }
  }

}
