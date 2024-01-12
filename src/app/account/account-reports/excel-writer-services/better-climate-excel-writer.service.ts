import { Injectable } from '@angular/core';
import * as ExcelJS from 'exceljs';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { BetterPlantsSummary } from 'src/app/models/overview-report';
import { getNAICS } from 'src/app/shared/form-data/naics-data';
import * as _ from 'lodash';
@Injectable({
  providedIn: 'root'
})
export class BetterClimateExcelWriterService {

  constructor() { }

  exportToExcel(report: IdbAccountReport, account: IdbAccount, analysisItem: IdbAccountAnalysisItem) {
    let workbook = new ExcelJS.Workbook();
    var request = new XMLHttpRequest();
    let requestURL: string = 'Better-Climate-Challenge-Emissions-Reporting';
    request.open('GET', 'assets/csv_templates/' + requestURL + '.xlsx', true);
    request.responseType = 'blob';
    request.onload = () => {
      workbook.xlsx.load(request.response).then(() => {
        workbook.xlsx.writeBuffer().then(excelData => {
          let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          let a = document.createElement("a");
          let url = window.URL.createObjectURL(blob);
          a.href = url;
          a.download = requestURL;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        });
      });
    };
    request.send();
  }

}
