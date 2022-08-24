import { Component, OnInit } from '@angular/core';
import { UploadDataService } from '../../upload-data.service';

@Component({
  selector: 'app-data-setup-banner',
  templateUrl: './data-setup-banner.component.html',
  styleUrls: ['./data-setup-banner.component.css']
})
export class DataSetupBannerComponent implements OnInit {

  fileReferences: Array<{
    name: string,
    // type: '.csv' | '.xlsx',
    file: any
  }>;
  constructor(private uploadDataService: UploadDataService) { }

  ngOnInit(): void {
    this.fileReferences = this.uploadDataService.fileReferences;
  }

}
