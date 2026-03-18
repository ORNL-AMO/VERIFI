import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { CopyTableService } from 'src/app/shared/helper-services/copy-table.service';

@Component({
    selector: 'app-calanderized-meter-data-table',
    templateUrl: './calanderized-meter-data-table.component.html',
    styleUrls: ['./calanderized-meter-data-table.component.css'],
    standalone: false
})
export class CalanderizedMeterDataTableComponent implements OnInit {
  @Input()
  calanderizedMeter: CalanderizedMeter;
  @Input()
  itemsPerPage: number;
  @Input()
  consumptionLabel: 'Consumption' | 'Distance';
  @Input()
  isRECs: boolean;

  @ViewChild('meterDataTable', { static: false }) meterDataTable: ElementRef;
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
  currentPageNumber: number = 1;
  copyingTable: boolean = false
  account: IdbAccount;
  constructor(private copyTableService: CopyTableService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit(): void {
    this.account = this.accountDbService.selectedAccount.getValue();
  }


  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  copyTable(){
    this.copyingTable = true;
    setTimeout(() => {
      this.copyTableService.copyTable(this.meterDataTable);
      this.copyingTable = false;
    }, 200)
  }
}
