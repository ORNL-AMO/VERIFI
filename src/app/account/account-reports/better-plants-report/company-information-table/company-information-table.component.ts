import { Component, Input } from '@angular/core';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-company-information-table',
  templateUrl: './company-information-table.component.html',
  styleUrls: ['./company-information-table.component.css']
})
export class CompanyInformationTableComponent {
  @Input()
  account: IdbAccount;
  
}
