import { Component, OnInit, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  title = 'verifi';
  constructor(private renderer: Renderer2) { 
    this.renderer.addClass(document.body, 'open');
  }

  ngOnInit() {
  }

}
