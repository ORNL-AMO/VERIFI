import { Component, OnInit } from '@angular/core';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent implements OnInit {

  constructor(private helpPanelService: HelpPanelService) { }

  ngOnInit(): void {
  }


  
  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }
}
