import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { IdbAccountReport } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class AccountReportsService {

  constructor(private formBuilder: FormBuilder) { }

  getSetupFormFromReport(report: IdbAccountReport): FormGroup {
    let form: FormGroup = this.formBuilder.group({
      name: [report.name, Validators.required],
      reportType: [report.reportType, Validators.required],
    });
    return form;
  }

  updateReportFromSetupForm(report: IdbAccountReport, form: FormGroup): IdbAccountReport {
    report.name = form.controls.name.value;
    report.reportType = form.controls.reportType.value;
    return report;
  }
}
