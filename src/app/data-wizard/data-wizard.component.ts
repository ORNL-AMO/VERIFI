import { Component, HostListener } from '@angular/core';
import { DataManagementService } from './data-management.service';

@Component({
  selector: 'app-data-wizard',
  templateUrl: './data-wizard.component.html',
  styleUrl: './data-wizard.component.css',
  standalone: false
})
export class DataWizardComponent {

  sidebarWidth: number;
  helpWidth: number;
  contentWidth: number;
  startingCursorX: number;
  isDraggingSidebar: boolean = false;
  isDraggingHelp: boolean = false;
  sidebarCollapsed: boolean = false;
  constructor(
    private dataManagementService: DataManagementService
  ) {

  }

  ngOnInit() {
    this.sidebarWidth = this.dataManagementService.sidebarWidth;
    this.helpWidth = this.dataManagementService.helpWidth;
    this.setContentWidth();
  }

  ngOnDestroy() {
    this.dataManagementService.sidebarWidth = this.sidebarWidth;
    this.dataManagementService.helpWidth = this.helpWidth;
    this.dataManagementService.fileReferences.next([]);
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
    this.dataManagementService.setHelpWidth(this.helpWidth);
    this.dataManagementService.setSidebarWidth(this.sidebarWidth);
  }

  drag(event: MouseEvent) {
    if (this.isDraggingSidebar) {
      if (event.clientX > 50) {
        this.sidebarWidth = event.clientX;
        this.dataManagementService.sidebarOpen.next(true);
      } else {
        this.sidebarWidth = 50;
        this.dataManagementService.sidebarOpen.next(false);
      }
      this.setContentWidth();
    }
    if (this.isDraggingHelp) {
      let helpWidth: number = (window.innerWidth - event.clientX)
      if (helpWidth > 50) {
        this.helpWidth = helpWidth;
        this.dataManagementService.helpPanelOpen.next(true);
      } else {
        this.helpWidth = 50;
        this.dataManagementService.helpPanelOpen.next(false);
      }
      this.setContentWidth();
    }
  }


  toggleCollapseSidebar(sidebarOpen: boolean) {
    this.dataManagementService.sidebarOpen.next(sidebarOpen);
    if (sidebarOpen) {
      this.sidebarWidth = 200;
    } else {
      this.sidebarWidth = 50;
    }
    this.setContentWidth();
  }

  toggleCollapseHelp(helpPanelOpen: boolean) {
    this.dataManagementService.helpPanelOpen.next(helpPanelOpen);
    if (helpPanelOpen) {
      this.helpWidth = 200;
    } else {
      this.helpWidth = 50;
    }
    this.dataManagementService.setHelpWidth(this.helpWidth);
    this.setContentWidth();
  }

  setContentWidth() {
    let contentWidth: number = (window.innerWidth - this.helpWidth - this.sidebarWidth);
    if (contentWidth < 600) {
      this.contentWidth = 600;
    } else {
      this.contentWidth = contentWidth;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setContentWidth();
  }
}
