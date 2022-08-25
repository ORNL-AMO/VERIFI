import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileReference, UploadDataService } from '../../upload-data.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-file-setup',
  templateUrl: './file-setup.component.html',
  styleUrls: ['./file-setup.component.css']
})
export class FileSetupComponent implements OnInit {

  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.activatedRoute.params.subscribe(param => {
      let id: string = param['id'];
      let fileReference: FileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });
      console.log(fileReference);
    })
  }

}
