import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { UploadDataService } from '../../upload-data.service';
import { FileReference } from '../../upload-data-models';

@Component({
  selector: 'app-data-setup-banner',
  templateUrl: './data-setup-banner.component.html',
  styleUrls: ['./data-setup-banner.component.css']
})
export class DataSetupBannerComponent implements OnInit {

  fileReferences: Array<FileReference>;
  modalOpen: boolean;
  modalOpenSub: Subscription;
  showStartOverModal: boolean = false;
  constructor(private uploadDataService: UploadDataService, private sharedDataService: SharedDataService,
    private router: Router) { }

  ngOnInit(): void {
    this.fileReferences = this.uploadDataService.fileReferences;
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    })
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
  }


  openStartOverModal() {
    this.showStartOverModal = true;
  }

  cancelStartOver() {
    this.showStartOverModal = false;
  }

  confirmStartOver() {
    this.showStartOverModal = false;
    this.router.navigateByUrl('/upload');
  }

}
