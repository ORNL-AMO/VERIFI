import { Component, OnInit } from '@angular/core';
import { Router, Event } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  open: boolean = true;
  isDev: boolean;
  isHovering: any;
  openFromHover: boolean;
  constructor(private localStorageService: LocalStorageService) {
    let sidebarOpen: boolean = this.localStorageService.retrieve("sidebarOpen");
    if (sidebarOpen != undefined) {
      this.open = sidebarOpen;
    }
  }

  ngOnInit() {
    this.isDev = !environment.production;
  }


  hoverIn() {
    if (!this.open) {
      this.isHovering = setTimeout(() => {
        this.openFromHover = true;
        this.toggleSidebar(false);
      }, 1000)
    }
  }

  hoverOut() {
    if (this.isHovering) {
      clearTimeout(this.isHovering);
    }
    if (this.openFromHover) {
      this.toggleSidebar(false);
    }
  }


  toggleSidebar(fromClick: boolean) {
    if (fromClick) {
      this.openFromHover = false;
    }
    if (this.isHovering) {
      clearTimeout(this.isHovering);
    }
    this.open = !this.open;
    window.dispatchEvent(new Event("resize"));
    this.localStorageService.store('sidebarOpen', this.open);
  }

}
