import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UploadDataService } from '../upload-data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-excel-wizard',
  templateUrl: './excel-wizard.component.html',
  styleUrls: ['./excel-wizard.component.css']
})
export class ExcelWizardComponent implements OnInit {
  selectedExcelFile: File;
  constructor(private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    // this.selectedExcelFile = this.uploadDataService.selectedExcelFile.getValue();



  }


  selectExcelFile(fileReference: any) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });

      /* grab first sheet */
      const wsname: string = wb.SheetNames[1];
      const ws: XLSX.WorkSheet = wb.Sheets["Sheet1"];
      var csv = XLSX.utils.sheet_to_csv(wb.Sheets["Sheet1"]);
      console.log(csv)
      var XL_row_object = XLSX.utils.sheet_to_json(wb.Sheets["Sheet1"], { header: 1 });
      console.log(XL_row_object);


      /* save data */
      // this.data = <AOA>(XL_row_object);
    };
    reader.readAsBinaryString(fileReference);
  }

}
