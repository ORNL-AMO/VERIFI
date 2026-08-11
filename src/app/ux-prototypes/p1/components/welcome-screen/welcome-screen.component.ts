import { Component, EventEmitter, Input, Output } from '@angular/core';
import { P1AccountSummary, P1WelcomeAction } from '../../p1.models';

@Component({
  selector: 'app-p1-welcome-screen',
  templateUrl: './welcome-screen.component.html',
  styleUrls: ['./welcome-screen.component.css'],
  standalone: false
})
export class P1WelcomeScreenComponent {
  @Input() accounts: Array<P1AccountSummary> = [];
  @Input() actions: Array<P1WelcomeAction> = [];

  @Output() workspaceRequested = new EventEmitter<string>();
}
