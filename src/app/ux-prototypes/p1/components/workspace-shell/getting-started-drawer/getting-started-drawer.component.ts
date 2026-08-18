import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-p1-getting-started-drawer',
  templateUrl: './getting-started-drawer.component.html',
  styleUrls: ['./getting-started-drawer.component.css'],
  standalone: false
})
export class P1GettingStartedDrawerComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() startTodos = new EventEmitter<void>();
}
