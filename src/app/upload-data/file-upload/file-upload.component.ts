import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FileReference, UploadDataService } from '../upload-data.service';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrls: ['./file-upload.component.css']
})
export class FileUploadComponent implements OnInit {

  fileReferences: Array<FileReference>;
  disableImport: boolean = false;
  filesUploaded: boolean = false;
  constructor(private router: Router, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.fileReferences = new Array();
  }

  setImportFile(files: FileList) {
    if (files) {
      if (files.length !== 0) {
        let regex3 = /.xlsx$/;
        for (let index = 0; index < files.length; index++) {
          if (regex3.test(files[index].name)) {
            this.fileReferences.push({
              name: files[index].name,
              file: files[index],
              dataSet: false,
              id: Math.floor(Math.random() * 100)
            });
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
    this.router.navigateByUrl('/upload/data-setup/file-setup/' + this.fileReferences[0].id);
  }
}
