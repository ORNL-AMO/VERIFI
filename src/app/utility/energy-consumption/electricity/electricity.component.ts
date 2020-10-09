import { Component, OnInit, ElementRef, ViewChild, QueryList, ViewChildren } from '@angular/core';
import { UtilityService } from "../../../utility/utility.service";
import { listAnimation } from '../../../animations';
import { EnergyConsumptionService } from "../energy-consumption.service";

@Component({
  selector: 'app-electricity',
  templateUrl: './electricity.component.html',
  styleUrls: ['./electricity.component.css'],
  animations: [
    listAnimation
  ]
})


export class ElectricityComponent implements OnInit {
  @ViewChildren("masterCheckbox") masterCheckbox: QueryList<ElementRef>;
  @ViewChild('inputFile') myInputVariable: ElementRef;

  meterList: any = [];

  page = 1;
  itemsPerPage = 6;
  pageSize: number;

  filterColMenu: boolean = false;
  filterCol = [
    {id: 0, filter: true, name: 'filterColBasicCharge', display: 'Basic Charge'},
    {id: 1, filter: false, name: 'filterColSupplyBlockAmt', display: 'Supply Block Amt'},
    {id: 2, filter: false, name: 'filterColSupplyBlockCharge', display: 'Supply Block Charge'},
    {id: 3, filter: false, name: 'filterColFlatRateAmt', display: 'Flat Rate Amt'},
    {id: 4, filter: false, name: 'filterColFlatRateCharge', display: 'Flat Rate Charge'},
    {id: 5, filter: false, name: 'filterColPeakAmt', display: 'Peak Amt'},
    {id: 6, filter: false, name: 'filterColPeakCharge', display: 'Peak Charge'},
    {id: 7, filter: false, name: 'filterColOffpeakAmt', display: 'Off-Peak Amt'},
    {id: 8, filter: false, name: 'filterColOffpeakCharge', display: 'Off-Peak Charge'},
    {id: 9, filter: false, name: 'filterColDemandBlockAmt', display: 'Demand Block Amt'},
    {id: 10, filter: false, name: 'filterColDemandBlockCharge', display: 'Demand Block Charge'},
    {id: 11, filter: false, name: 'filterColGenTransCharge', display: 'Generation and Transmission Charge'},
    {id: 12, filter: true, name: 'filterColDeliveryCharge', display: 'Delivery Charge'},
    {id: 13, filter: false, name: 'filterColTransCharge', display: 'Transmission Charge'},
    {id: 14, filter: false, name: 'filterColPowerFactorCharge', display: 'Power Factor Charge'},
    {id: 15, filter: false, name: 'filterColBusinessCharge', display: 'Local Business Charge'},
    {id: 16, filter: true, name: 'filterColUtilityTax', display: 'Utility Tax'},
    {id: 17, filter: true, name: 'filterColLatePayment', display: 'Late Payment'},
    {id: 18, filter: true, name: 'filterColOtherCharge', display: 'Other Charge'}
  ];

  filterInpMenu: boolean = false;
  filterInp = [
    {id: 0, filter: true, name: 'filterInpBasicCharge', display: 'Basic Charge'},
    {id: 1, filter: false, name: 'filterInpSupplyBlockAmt', display: 'Supply Block Amt'},
    {id: 2, filter: false, name: 'filterInpSupplyBlockCharge', display: 'Supply Block Charge'},
    {id: 3, filter: false, name: 'filterInpFlatRateAmt', display: 'Flat Rate Amt'},
    {id: 4, filter: false, name: 'filterInpFlatRateCharge', display: 'Flat Rate Charge'},
    {id: 5, filter: false, name: 'filterInpPeakAmt', display: 'Peak Amt'},
    {id: 6, filter: false, name: 'filterInpPeakCharge', display: 'Peak Charge'},
    {id: 7, filter: false, name: 'filterInpOffpeakAmt', display: 'Off-Peak Amt'},
    {id: 8, filter: false, name: 'filterInpOffpeakCharge', display: 'Off-Peak Charge'},
    {id: 9, filter: false, name: 'filterInpDemandBlockAmt', display: 'Demand Block Amt'},
    {id: 10, filter: false, name: 'filterInpDemandBlockCharge', display: 'Demand Block Charge'},
    {id: 11, filter: false, name: 'filterInpGenTransCharge', display: 'Generation and Transmission Charge'},
    {id: 12, filter: true, name: 'filterInpDeliveryCharge', display: 'Delivery Charge'},
    {id: 13, filter: false, name: 'filterInpTransCharge', display: 'Transmission Charge'},
    {id: 14, filter: false, name: 'filterInpPowerFactorCharge', display: 'Power Factor Charge'},
    {id: 15, filter: false, name: 'filterInpBusinessCharge', display: 'Local Business Charge'},
    {id: 16, filter: true, name: 'filterInpUtilityTax', display: 'Utility Tax'},
    {id: 17, filter: true, name: 'filterInpLatePayment', display: 'Late Payment'},
    {id: 18, filter: true, name: 'filterInpOtherCharge', display: 'Other Charge'}
  ];

  constructor(
    private utilityService: UtilityService,
    public energyConsumptionService: EnergyConsumptionService
    ) { }

  ngOnInit() {
    // Observe the meter list
    this.utilityService.getMeterData().subscribe((value) => {
      this.meterList = value;
      console.log(value);
      this.meterList = this.meterList.filter(function(obj) {
        return obj.type == "Electricity"
      });
    });    
  }

  showAllFields() {
    for(let i=0; i < this.filterInp.length; i++) {
      this.filterInp[i]["filter"] = true;
    }
  }

  showAllColumns() {
    for(let i=0; i < this.filterCol.length; i++) {
      this.filterCol[i]["filter"] = true;
    }
  }

  resetImport() {
    this.myInputVariable.nativeElement.value = '';
  }

  public onPageChange(pageNum: number): void {
    this.pageSize = this.itemsPerPage*(pageNum - 1);
  }
  
  public changePagesize(num: number): void {
    this.itemsPerPage = num;
    this.onPageChange(this.page);
  }
}
