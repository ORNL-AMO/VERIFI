import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FileReference, UploadDataService } from '../../upload-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-file-setup',
  templateUrl: './file-setup.component.html',
  styleUrls: ['./file-setup.component.css']
})
export class FileSetupComponent implements OnInit {

  fileReference: FileReference;
  paramsSub: Subscription;
  constructor(private activatedRoute: ActivatedRoute, private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.paramsSub = this.activatedRoute.params.subscribe(param => {
      let id: string = param['id'];
      this.fileReference = this.uploadDataService.fileReferences.find(ref => { return ref.id == id });

    });
  }

  ngOnDestroy() {
    this.paramsSub.unsubscribe();
  }

}
