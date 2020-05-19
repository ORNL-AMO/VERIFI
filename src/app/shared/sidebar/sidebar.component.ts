import { Component, OnInit, Renderer2 } from '@angular/core';
import { $ } from 'protractor';
import { trigger, state, style, animate, transition } from '@angular/animations';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  open: boolean;
  constructor(private renderer: Renderer2) {
    this.renderer.addClass(document.body, 'open');
   }

  ngOnInit() {
    this.open = true;
  }

  toggleSidebar() {
    this.open = !this.open;
    const action = this.open ? 'addClass' : 'removeClass';
    this.renderer[action](document.body, 'open');
    if (action === "removeClass") {
      
    }
  }

}
