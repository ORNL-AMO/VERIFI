import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { UploadDataService } from '../upload-data.service';
import * as XLSX from 'xlsx';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { FileReference } from '../upload-data-models';

@Component({
    selector: 'app-file-upload',
    templateUrl: './file-upload.component.html',
    styleUrls: ['./file-upload.component.css'],
    standalone: false
})
export class FileUploadComponent implements OnInit {

  fileReferences: Array<FileReference>;
  disableImport: boolean = false;
  filesUploaded: boolean = false;
  fileUploadError: boolean = false;
  dragOver: boolean = false;
  constructor(private router: Router, private uploadDataService: UploadDataService,
    private exportToExcelTemplateService: ExportToExcelTemplateService) { }

  ngOnInit(): void {
    this.fileReferences = new Array();
  }

  setImportFile(event: EventTarget) {
    let files: FileList = (event as HTMLInputElement).files;
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {

            this.addFile(files[index]);
          }
        }
      }
    }
  }

  removeReference(index: number) {
    this.fileReferences.splice(index, 1);
  }

  continue() {
    this.uploadDataService.fileReferences = this.fileReferences;
    if (this.fileReferences[0].isTemplate) {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id + '/template-facilities');
    } else {
      this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id);
    }
  }

  addFile(file: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      let workBook: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      try {
        console.log('try!')
        let fileReference: FileReference = this.uploadDataService.getFileReference(file, workBook, false);
        this.fileReferences.push(fileReference);
      } catch (err) {
        console.log(err);
        this.fileUploadError = true;
      }
    };
    reader.readAsBinaryString(file);
  }

  setDragEnter() {
    this.dragOver = true;
  }

  setDragOut() {
    this.dragOver = false;
  }

  downloadTemplate() {
    this.exportToExcelTemplateService.exportFacilityData();
  }
}