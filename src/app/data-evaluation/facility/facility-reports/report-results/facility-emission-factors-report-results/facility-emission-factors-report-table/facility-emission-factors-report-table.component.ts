import { Component, Input } from '@angular/core';
import { EmissionsRate } from 'src/app/models/eGridEmissions';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-emission-factors-report-table',
  standalone: false,
  
  templateUrl: './facility-emission-factors-report-table.component.html',
  styleUrl: './facility-emission-factors-report-table.component.css'
})
export class FacilityEmissionFactorsReportTableComponent {

  @Input()
  emissionDataElectricity: Array<{ year: number, marketRate: EmissionsRate, locationRate: EmissionsRate, directEmissionsRate: boolean }> = [];
  @Input()
  emissionData: Array<{ source: string, fuelValue: string, CO2: number, CH4: number, N2O: number, unit: string }> = [];
  @Input()
  facility: IdbFacility;

}
