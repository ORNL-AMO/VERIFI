import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';

@Component({
  selector: 'app-help-panel',
  templateUrl: './help-panel.component.html',
  styleUrls: ['./help-panel.component.css']
})
export class HelpPanelComponent implements OnInit {

  helpText: string;

  constructor(private router: Router) { 
    router.events.subscribe((route) => {
      if (route instanceof NavigationEnd) {
        this.helpText = route.url.replace('/utility/','');
      }
    });
  }

  ngOnInit() {
  }

}
