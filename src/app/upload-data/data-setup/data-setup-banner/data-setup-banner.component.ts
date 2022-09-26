import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { FileReference, UploadDataService } from '../../upload-data.service';

@Component({
  selector: 'app-data-setup-banner',
  templateUrl: './data-setup-banner.component.html',
  styleUrls: ['./data-setup-banner.component.css']
})
export class DataSetupBannerComponent implements OnInit {

  fileReferences: Array<FileReference>;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  constructor(private uploadDataService: UploadDataService, private sharedDataService: SharedDataService) { }

  ngOnInit(): void {
    this.fileReferences = this.uploadDataService.fileReferences;
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy(){
    this.modalOpenSub.unsubscribe();
  }

}
