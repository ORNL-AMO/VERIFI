import { Component, inject } from '@angular/core';
import { P1RouteFacade } from '../../p1-route.facade';

@Component({
  selector: 'app-p1-workspace-shell',
  templateUrl: './workspace-shell.component.html',
  styleUrls: ['./workspace-shell.component.css'],
  standalone: false
})
export class P1WorkspaceShellComponent {
  readonly facade = inject(P1RouteFacade);
}
