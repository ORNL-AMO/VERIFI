import { Component, Input } from '@angular/core';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-sep-facility-information-table',
  templateUrl: './sep-facility-information-table.component.html',
  styleUrl: './sep-facility-information-table.component.css'
})
export class SepFacilityInformationTableComponent {
  @Input({required: true})
  facility: IdbFacility;
  @Input({required: true})
  account: IdbAccount;
  @Input({required: true})
  facilityReport: IdbFacilityReport; 
  
}
