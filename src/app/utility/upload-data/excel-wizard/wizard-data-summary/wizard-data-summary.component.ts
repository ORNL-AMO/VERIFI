import { Component, Input, OnInit } from '@angular/core';
import { ImportMeterFileSummary } from '../../import-meter.service';

@Component({
  selector: 'app-wizard-data-summary',
  templateUrl: './wizard-data-summary.component.html',
  styleUrls: ['./wizard-data-summary.component.css']
})
export class WizardDataSummaryComponent implements OnInit {
  @Input()
  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string };

  constructor() { }

  ngOnInit(): void {
  }

}
