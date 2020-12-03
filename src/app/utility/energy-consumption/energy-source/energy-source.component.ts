import { Component, OnInit } from '@angular/core';
import { AccountdbService } from "../../../indexedDB/account-db.service";
import { FacilitydbService } from "../../../indexedDB/facility-db.service";
import { UtilityMeterDatadbService } from "../../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterdbService } from "../../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../../indexedDB/utilityMeterGroup-db.service";
import { listAnimation } from '../../../animations';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-energy-source',
  templateUrl: './energy-source.component.html',
  styleUrls: ['./energy-source.component.css'],
  animations: [
    listAnimation
  ],
  host: {
    '(document:click)': 'documentClick($event)',
  }
})
export class EnergySourceComponent implements OnInit {

  meterMenuOpen: number;

  // energySources: any;
  // selectedMeter: any;
  meterList: Array<IdbUtilityMeter>;
  meterListSub: Subscription;
  // energyFinalUnit: string;

  page: number = 1;
  itemsPerPage: number = 10;
  pageSize: number;
  importWindow: boolean;
  editMeter: IdbUtilityMeter;
  meterToDelete: IdbUtilityMeter;
  selectedFacilitySub: Subscription;
  selectedFacilityName: string = 'Facility';
  constructor(
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
  ) { }

  ngOnInit() {
    this.meterListSub = this.utilityMeterdbService.facilityMeters.subscribe(meters => {
      this.meterList = meters;
    });

    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(facility => {
      if (facility) {
        this.selectedFacilityName = facility.name;
      }
    });
    // Observe the energy final unit (not sure how the energyFinalUnit is used...-mark)
    // this.utilityService.getEnergyFinalUnit().subscribe((value) => {
    //   this.energyFinalUnit = value;
    // });
  }

  ngOnDestroy() {
    this.meterListSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  // Close menus when user clicks outside the dropdown
  documentClick() {
    this.meterMenuOpen = null;
  }

  meterToggleMenu(index: number) {
    if (this.meterMenuOpen === index) {
      this.meterMenuOpen = null;
    } else {
      this.meterMenuOpen = index;
    }
  }

  addMeter() {
    let selectedFacility: IdbFacility = this.facilitydbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
    let utilityMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedAccount.id);
    this.utilityMeterdbService.addWithObservable(utilityMeter).subscribe(meterId => {
      this.utilityMeterdbService.setFacilityMeters();
      utilityMeter.id = meterId;
      this.selectEditMeter(utilityMeter);
    });
  }

  meterExport() {
    const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
    const header = Object.keys(this.meterList[0]);
    let csvData: Array<string> = this.meterList.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));
    csvData.unshift(header.join(','));
    let csvBlob: BlobPart = csvData.join('\r\n');

    //Download the file as CSV
    var downloadLink = document.createElement("a");
    var blob = new Blob(["\ufeff", csvBlob]);
    var url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = "VerifiMeterDump.csv";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage * (pageNum - 1);
  }

  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }

  closeImportWindow() {
    this.importWindow = false;
  }

  showImportWindow() {
    this.importWindow = true;
  }

  selectEditMeter(meter: IdbUtilityMeter) {
    this.editMeter = meter;
  }

  closeEditMeter() {
    this.editMeter = undefined;
  }


  deleteMeter() {
    //delete meter
    this.utilityMeterdbService.deleteIndex(this.meterToDelete.id);
    //delete meter data
    this.utilityMeterDatadbService.deleteMeterDataByMeterId(this.meterToDelete.id);
    this.cancelDelete();
  }

  selectDeleteMeter(meter: IdbUtilityMeter) {
    this.meterToDelete = meter;
  }

  cancelDelete() {
    this.meterToDelete = undefined;
    this.meterMenuOpen = null;
  }
}