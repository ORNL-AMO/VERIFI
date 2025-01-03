import { Component, HostListener } from '@angular/core';
import { DataWizardService } from './data-wizard.service';

@Component({
  selector: 'app-data-wizard',
  templateUrl: './data-wizard.component.html',
  styleUrl: './data-wizard.component.css'
})
export class DataWizardComponent {

  sidebarWidth: number = 200;
  helpWidth: number = 200;
  contentWidth: number;
  startingCursorX: number;
  isDraggingSidebar: boolean = false;
  isDraggingHelp: boolean = false;
  sidebarCollapsed: boolean = false;
  constructor(
    private dataWizardService: DataWizardService
  ) {

  }

  ngOnInit() {
    this.sidebarWidth = this.dataWizardService.sidebarWidth;
    this.helpWidth = this.dataWizardService.helpWidth;
    this.setContentWidth();
  }

  ngOnDestroy() {
    this.dataWizardService.sidebarWidth = this.sidebarWidth;
    this.dataWizardService.helpWidth = this.helpWidth;
  }

  startResizingSidebar(event: MouseEvent): void {
    this.startingCursorX = event.clientX;
    this.isDraggingSidebar = true;
  }

  startResizingHelp(event: MouseEvent): void {
    this.startingCursorX = event.clientX;
    this.isDraggingHelp = true;
  }

  stopResizing($event: MouseEvent) {
    this.isDraggingSidebar = false;
    this.isDraggingHelp = false;
  }

  drag(event: MouseEvent) {
    if (this.isDraggingSidebar) {
      if (event.clientX > 50) {
        this.sidebarWidth = event.clientX;
        this.dataWizardService.sidebarOpen.next(true);
      } else {
        this.sidebarWidth = 50;
        this.dataWizardService.sidebarOpen.next(false);
      }
      this.setContentWidth();
    }
    if (this.isDraggingHelp) {
      let helpWidth: number = (window.innerWidth - event.clientX)
      if (helpWidth > 50) {
        this.helpWidth = helpWidth;
        this.dataWizardService.helpPanelOpen.next(true);
      } else {
        this.helpWidth = 50;
        this.dataWizardService.helpPanelOpen.next(false);
      }
      this.setContentWidth();
    }
  }


  toggleCollapseSidebar(sidebarOpen: boolean) {
    this.dataWizardService.sidebarOpen.next(sidebarOpen);
    if (sidebarOpen) {
      this.sidebarWidth = 200;
    } else {
      this.sidebarWidth = 50;
    }
    this.setContentWidth();
  }

  toggleCollapseHelp(helpPanelOpen: boolean) {
    this.dataWizardService.helpPanelOpen.next(helpPanelOpen);
    if (helpPanelOpen) {
      this.helpWidth = 200;
    } else {
      this.helpWidth = 50;
    }
    this.setContentWidth();
  }

  setContentWidth() {
    let contentWidth: number = (window.innerWidth - this.helpWidth - this.sidebarWidth);
    if(contentWidth < 600){
      this.contentWidth = 600;
    }else{
      this.contentWidth = contentWidth;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setContentWidth();
  }
}
