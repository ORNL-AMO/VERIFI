import { Component, EventEmitter, Output } from '@angular/core';
import { DataWizardService } from '../data-wizard.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-data-management-side-panel',
  standalone: false,
  
  templateUrl: './data-management-side-panel.component.html',
  styleUrl: './data-management-side-panel.component.css'
})
export class DataManagementSidePanelComponent {
  @Output('emitToggleCollapse')
  emitToggleCollapse: EventEmitter<boolean> = new EventEmitter<boolean>(false);


  helpPanelOpenSub: Subscription;
  helpPanelOpen: boolean;

  activePanel: 'help' | 'checklist' = 'checklist';

  constructor(
    private dataWizardService: DataWizardService
  ) {

  }

  ngOnInit() {
    this.helpPanelOpenSub = this.dataWizardService.helpPanelOpen.subscribe(val => {
      this.helpPanelOpen = val;
      //needed to resize charts
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
    });
  }

  ngOnDestroy() {
    this.helpPanelOpenSub.unsubscribe();
  }

  toggleCollapseHelpPanel() {
    this.emitToggleCollapse.emit(!this.helpPanelOpen);
  }


  setActivePanel(str: 'help' | 'checklist') {
    this.activePanel = str;
  }
  
}
