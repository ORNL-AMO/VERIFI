import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { skip, take } from 'rxjs';
import { ElectronService } from 'src/app/electron/electron.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-view-connect-bill',
  standalone: false,

  templateUrl: './view-connect-bill.component.html',
  styleUrl: './view-connect-bill.component.css'
})
export class ViewConnectBillComponent {

  @Input()
  meterData: IdbUtilityMeterData;
  isElectron: boolean;
  key: string;
  savedUtilityFilePath: string;
  utilityFileDeleted: boolean = false;
  deletedPath: string;
  isBillConnected: boolean = false;
  constructor(
    private electronService: ElectronService,
    private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.isElectron = this.electronService.isElectron;
    this.isBillConnected = this.meterData.isBillConnected;
  }

  ngOnChanges() {
    if (this.meterData) {
      this.isBillConnected = this.meterData.isBillConnected;
    }
  }

  async viewUtilityBill(meterData) {
    this.key = meterData.guid;
    this.electronService.getFilePath(this.key).pipe(take(1)).subscribe(path => {
      this.savedUtilityFilePath = path;
      if (this.savedUtilityFilePath) {
        this.electronService.checkUtilityFileExists(this.key, this.savedUtilityFilePath);
        this.electronService.getDeletedFile(this.key).pipe(
          skip(1),
          take(1)
        ).subscribe(isDeleted => {
          this.utilityFileDeleted = isDeleted;
          this.cd.detectChanges();
          if (!isDeleted) {
            this.electronService.openFileLocation(this.key);
            this.cd.detectChanges();
          } else {
            this.utilityFileDeleted = true;
            this.savedUtilityFilePath = null;
            this.cd.detectChanges();
          }
        });
      } else {
        this.utilityFileDeleted = true;
        this.cd.detectChanges();
      }
    });
  }
}
