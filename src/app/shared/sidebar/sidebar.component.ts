import { Component, OnInit, Renderer2, isDevMode } from '@angular/core';
import { Router, Event, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  open: boolean;
  isDev: boolean;
  isHovering: any;
  openFromHover: boolean;
  constructor(
    private renderer: Renderer2,
    private router: Router) {

    router.events.subscribe((event: Event) => {
      if (router.url.toString() === "/") {
        // Keep sidebar open if its the homepage
        this.open = false;
        this.toggleSidebar(true);
      }
    });

  }

  ngOnInit() {
    this.isDev = isDevMode();
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
    // let action: string = 'removeClass';
    // if (this.open) {
    //   action = 'addClass';
    // }
    // this.renderer[action](document.body, 'open');
  }

}
