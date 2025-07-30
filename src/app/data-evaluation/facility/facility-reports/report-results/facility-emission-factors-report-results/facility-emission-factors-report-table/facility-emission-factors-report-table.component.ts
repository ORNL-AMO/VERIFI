import { Component, Input } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { EmissionElectricity, EmissionOthers } from '../facility-emission-factors-report-results.component';

@Component({
  selector: 'app-facility-emission-factors-report-table',
  standalone: false,
  
  templateUrl: './facility-emission-factors-report-table.component.html',
  styleUrl: './facility-emission-factors-report-table.component.css'
})
export class FacilityEmissionFactorsReportTableComponent {

  @Input()
  electricityMeters: Array<string> = [];
  @Input()
  emissionDataElectricity: Array<EmissionElectricity> = [];
  @Input()
  emissionData: Array<EmissionOthers> = [];
  @Input()
  facility: IdbFacility;
}
