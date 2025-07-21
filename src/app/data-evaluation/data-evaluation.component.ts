import { Component, HostListener } from '@angular/core';
import { DataEvaluationService } from './data-evaluation.service';

@Component({
  selector: 'app-data-evaluation',
  standalone: false,
  templateUrl: './data-evaluation.component.html',
  styleUrl: './data-evaluation.component.css'
})
export class DataEvaluationComponent {

  sidebarWidth: number;
  helpWidth: number;
  contentWidth: number;
  startingCursorX: number;
  isDraggingSidebar: boolean = false;
  isDraggingHelp: boolean = false;
  sidebarCollapsed: boolean = false;
  constructor(
    private dataEvaluationService: DataEvaluationService
  ) {

  }

  ngOnInit() {
    this.sidebarWidth = this.dataEvaluationService.sidebarWidth;
    this.helpWidth = this.dataEvaluationService.helpWidth;
    this.setContentWidth();
  }

  ngOnDestroy() {
    this.dataEvaluationService.sidebarWidth = this.sidebarWidth;
    this.dataEvaluationService.helpWidth = this.helpWidth;
    this.dataEvaluationService.fileReferences.next([]);
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
    this.dataEvaluationService.setHelpWidth(this.helpWidth);
    this.dataEvaluationService.setSidebarWidth(this.sidebarWidth);
  }

  drag(event: MouseEvent) {
    if (this.isDraggingSidebar) {
      if (event.clientX > 70) {
        this.sidebarWidth = event.clientX;
        this.dataEvaluationService.sidebarOpen.next(true);
      } else {
        this.sidebarWidth = 70;
        this.dataEvaluationService.sidebarOpen.next(false);
      }
      this.setContentWidth();
    }
    if (this.isDraggingHelp) {
      let helpWidth: number = (window.innerWidth - event.clientX)
      if (helpWidth > 50) {
        this.helpWidth = helpWidth;
        this.dataEvaluationService.helpPanelOpen.next(true);
      } else {
        this.helpWidth = 50;
        this.dataEvaluationService.helpPanelOpen.next(false);
      }
      this.setContentWidth();
    }
  }


  toggleCollapseSidebar(sidebarOpen: boolean) {
    this.dataEvaluationService.sidebarOpen.next(sidebarOpen);
    if (sidebarOpen) {
      this.sidebarWidth = 260;
    } else {
      this.sidebarWidth = 70;
    }
    this.setContentWidth();
  }

  toggleCollapseHelp(helpPanelOpen: boolean) {
    this.dataEvaluationService.helpPanelOpen.next(helpPanelOpen);
    if (helpPanelOpen) {
      this.helpWidth = 200;
    } else {
      this.helpWidth = 50;
    }
    this.dataEvaluationService.setHelpWidth(this.helpWidth);
    this.setContentWidth();
  }

  setContentWidth() {
    let contentWidth: number = (window.innerWidth - this.helpWidth - this.sidebarWidth);
    if (contentWidth < 600) {
      this.contentWidth = 600;
    } else {
      this.contentWidth = contentWidth;
    }
    this.dataEvaluationService.helpWidthBs.next(this.helpWidth);
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.setContentWidth();
  }
}
