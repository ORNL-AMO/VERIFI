import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HelpPanelService } from '../help-panel/help-panel.service';
import { UploadDataService } from './upload-data.service';

@Component({
  selector: 'app-upload-data',
  templateUrl: './upload-data.component.html',
  styleUrls: ['./upload-data.component.css']
})
export class UploadDataComponent implements OnInit {

  constructor(private helpPanelService: HelpPanelService, private uploadDataService: UploadDataService,
    private router: Router) { }

  ngOnInit(): void {
    if (this.uploadDataService.fileReferences.length == 0 && !this.router.url.includes('file-upload')) {
      this.router.navigateByUrl('/upload/file-upload');
    }
  }

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}
