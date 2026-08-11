import { Component, Signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { ApplicationLifecycleService } from '../application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-existing-ux-shell',
  templateUrl: './existing-ux-shell.component.html',
  styleUrls: ['./existing-ux-shell.component.css'],
  standalone: false
})
export class ExistingUxShellComponent {
  readonly persistenceReady: Signal<boolean>;
  inDataManagement = false;

  constructor(
    public router: Router,
    lifecycle: ApplicationLifecycleService
  ) {
    this.persistenceReady = lifecycle.persistenceReady;
  }

  ngOnInit(): void {
    this.setRouteState(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setRouteState(event.urlAfterRedirects);
      }
    });
  }

  private setRouteState(url: string): void {
    this.inDataManagement = url.includes('data-management');
  }
}
