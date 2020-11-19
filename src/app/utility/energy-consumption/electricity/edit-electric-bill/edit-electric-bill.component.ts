import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db-service';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyConsumptionService } from '../../energy-consumption.service';

@Component({
  selector: 'app-edit-electric-bill',
  templateUrl: './edit-electric-bill.component.html',
  styleUrls: ['./edit-electric-bill.component.css', '../electricity.component.css']
})
export class EditElectricBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  filterInpMenu: boolean = false;
  filterInp = [
    { id: 0, filter: true, name: 'filterInpBasicCharge', display: 'Basic Charge' },
    { id: 1, filter: false, name: 'filterInpSupplyBlockAmt', display: 'Supply Block Amt' },
    { id: 2, filter: false, name: 'filterInpSupplyBlockCharge', display: 'Supply Block Charge' },
    { id: 3, filter: false, name: 'filterInpFlatRateAmt', display: 'Flat Rate Amt' },
    { id: 4, filter: false, name: 'filterInpFlatRateCharge', display: 'Flat Rate Charge' },
    { id: 5, filter: false, name: 'filterInpPeakAmt', display: 'Peak Amt' },
    { id: 6, filter: false, name: 'filterInpPeakCharge', display: 'Peak Charge' },
    { id: 7, filter: false, name: 'filterInpOffpeakAmt', display: 'Off-Peak Amt' },
    { id: 8, filter: false, name: 'filterInpOffpeakCharge', display: 'Off-Peak Charge' },
    { id: 9, filter: false, name: 'filterInpDemandBlockAmt', display: 'Demand Block Amt' },
    { id: 10, filter: false, name: 'filterInpDemandBlockCharge', display: 'Demand Block Charge' },
    { id: 11, filter: false, name: 'filterInpGenTransCharge', display: 'Generation and Transmission Charge' },
    { id: 12, filter: true, name: 'filterInpDeliveryCharge', display: 'Delivery Charge' },
    { id: 13, filter: false, name: 'filterInpTransCharge', display: 'Transmission Charge' },
    { id: 14, filter: false, name: 'filterInpPowerFactorCharge', display: 'Power Factor Charge' },
    { id: 15, filter: false, name: 'filterInpBusinessCharge', display: 'Local Business Charge' },
    { id: 16, filter: true, name: 'filterInpUtilityTax', display: 'Utility Tax' },
    { id: 17, filter: true, name: 'filterInpLatePayment', display: 'Late Payment' },
    { id: 18, filter: true, name: 'filterInpOtherCharge', display: 'Other Charge' }
  ];



  meterDataForm: FormGroup;
  constructor(private energyConsumptionService: EnergyConsumptionService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.meterDataForm = this.energyConsumptionService.getElectricityMeterDataForm(this.editMeterData);
  }


  showAllFields() {
    for (let i = 0; i < this.filterInp.length; i++) {
      this.filterInp[i].filter = true;
    }
  }

  toggleFilterInpsFilter(index: number) {
    this.filterInp[index].filter = !this.filterInp[index].filter;
  }

  cancel() {
    this.emitClose.emit(true);
  }

  meterDataSave() {
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(this.meterDataForm.value);
    } else {
      let meterData: IdbUtilityMeterData = this.meterDataForm.value;
      delete meterData.id;
      this.utilityMeterDataDbService.add(this.meterDataForm.value);
    }
    this.cancel();
  }

  toggleFilterInpMenu() {
    this.filterInpMenu = !this.filterInpMenu;
  }
}
