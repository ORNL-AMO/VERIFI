import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { skip, take } from 'rxjs';
import { ElectronService } from 'src/app/electron/electron.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-edit-connect-bill',
  standalone: false,
  templateUrl: './edit-connect-bill.component.html',
  styleUrl: './edit-connect-bill.component.css'
})
export class EditConnectBillComponent {

  @Input()
  editMeterData: IdbUtilityMeterData;

  savedUtilityFilePath: string;
  utilityFileDeleted: boolean = false;
  deletedPath: string;
  key: string;
  folderPath: string;
  folderError: boolean = false;

  constructor(
    private electronService: ElectronService,
    private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.key = this.editMeterData.guid;
    this.electronService.getFilePath(this.key).subscribe(path => {
      this.savedUtilityFilePath = path;
      if (path) {
        this.utilityFileDeleted = false;
      }
      this.cd.detectChanges();
    });

    this.electronService.getDeletedFile(this.key).subscribe(deleted => {
      this.utilityFileDeleted = deleted;
      this.deletedPath = this.savedUtilityFilePath;
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
      let date;
      if ((this.editMeterData.readDate))
        date = this.editMeterData.readDate.getFullYear() + '-' + (this.editMeterData.readDate.getMonth() + 1) + '-' + this.editMeterData.readDate.getDate();
      await this.electronService.selectFile(this.key, this.folderPath, this.editMeterData.meterNumber, date);
      this.electronService.getFilePath(this.key).pipe(take(1)).subscribe(path => {
        if (path) {
          this.savedUtilityFilePath = path;
          this.editMeterData.isBillConnected = true;
        }
      });
    }
  }

  async openBillLocation() {
    this.electronService.checkUtilityFileExists(this.key, this.savedUtilityFilePath);
    this.electronService.getDeletedFile(this.key).pipe(
      skip(1),
      take(1)
    ).subscribe(isDeleted => {
      if (!isDeleted) {
        this.electronService.openFileLocation(this.key);
      } else {
        this.editMeterData.isBillConnected = false;
        console.warn('File does not exist or has been deleted.');
      }
    });
  }

}
