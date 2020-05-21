import { Component, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { Router, Event, NavigationEnd} from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  open: boolean;

  constructor(
    private renderer: Renderer2,
    private eRef: ElementRef,
    private router: Router) {

    router.events.subscribe( (event: Event) => {
      if (event instanceof NavigationEnd) {
        // Close sidebar on navigation
        this.open = true;
        this.toggleSidebar();
      } else if (router.url.toString() === "/") {
        // Keep sidebar open if its the homepage
        this.open = false;
        this.toggleSidebar();
      }
    });

  }

  ngOnInit() {}

  toggleSidebar() {
    this.open = !this.open;
    const action = this.open ? 'addClass' : 'removeClass';
    this.renderer[action](document.body, 'open');
    if (action === "removeClass") {
      
    }
  }

}
