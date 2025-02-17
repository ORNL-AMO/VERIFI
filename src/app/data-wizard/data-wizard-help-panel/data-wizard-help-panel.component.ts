import { Component, EventEmitter, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataWizardService } from '../data-wizard.service';

@Component({
  selector: 'app-data-wizard-help-panel',
  templateUrl: './data-wizard-help-panel.component.html',
  styleUrl: './data-wizard-help-panel.component.css',
  standalone: false
})
export class DataWizardHelpPanelComponent {
  @Output('emitToggleCollapse')
  emitToggleCollapse: EventEmitter<boolean> = new EventEmitter<boolean>(false);

  helpPanelOpenSub: Subscription;
  helpPanelOpen: boolean;

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
}
