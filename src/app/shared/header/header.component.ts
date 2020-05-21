import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, Event, NavigationStart} from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  host: {
    '(document:click)': 'functionClick($event)',
  }
})
export class HeaderComponent implements OnInit {
  accountMenu: boolean;
  facilityMenu: boolean;

  constructor(
    private eRef: ElementRef,
    private router: Router
    ) { 
      // Close menus on navigation
      router.events.subscribe( (event: Event) => {
        if (event instanceof NavigationStart) {
          this.accountMenu = false;
          this.facilityMenu = false;
        }
      });
    }

  ngOnInit() {
    this.accountMenu = false;
    this.facilityMenu = false;
  }

  toggleFacilityMenu() {
    this.facilityMenu = !this.facilityMenu;
    this.accountMenu = false;
  }
  toggleAccountMenu() {
    this.accountMenu = !this.accountMenu;
    this.facilityMenu = false;
  }

  
  // close menus when user clicks outside the dropdown
  functionClick (){
    if(!this.eRef.nativeElement.contains(event.target)) {
      this.accountMenu = false;
      this.facilityMenu = false;
    }
  }

  

}
