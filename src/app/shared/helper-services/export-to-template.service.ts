import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import * as XLSX from 'xlsx';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idb';
@Injectable({
  providedIn: 'root'
})
export class ExportToTemplateService {

  constructor(private http: HttpClient, private utilityMeterDbService: UtilityMeterdbService) { }

  exportToTemplate() {
    this.http.get("assets/csv_templates/VERIFI-Import-Data.xlsx", { responseType: "arraybuffer" }).subscribe(
      data => {
        console.log(data);
        let blob = new Blob([data], { type: 'application/mx-excel' });
        this.readWorkbook(blob);
      },
      error => {
        console.log("ERROROROOROR")
        console.log(error);
      }
    );
  }

  readWorkbook(fileReference: any) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      let templateWorkbook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      console.log(templateWorkbook)
      this.writeToWorkbook(templateWorkbook);
    };
    reader.readAsBinaryString(fileReference);
  }

  writeToWorkbook(workbook: XLSX.WorkBook){
    //meters
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let metersWS: XLSX.WorkSheet = XLSX.utils.json_to_sheet(meters);
    console.log(metersWS);
    let metersWorksheet: XLSX.WorkSheet = workbook.Sheets["Meters-Utilities"];
    workbook.Sheets["Meters-Utilities"] = metersWS;
    console.log(metersWorksheet);
  }
}
