import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';
import { getNAICS } from 'src/app/shared/form-data/naics-data';

@Component({
  selector: 'app-company-information-table',
  templateUrl: './company-information-table.component.html',
  styleUrls: ['./company-information-table.component.css']
})
export class CompanyInformationTableComponent implements OnInit {
  @Input()
  account: IdbAccount;
  
  naics: string;
  constructor() { }

  ngOnInit(): void {
    this.naics = getNAICS(this.account);
  }

}
