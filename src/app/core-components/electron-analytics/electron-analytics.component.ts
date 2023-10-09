import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { ElectronService } from 'src/app/electron/electron.service';

@Component({
  selector: 'app-electron-analytics',
  templateUrl: './electron-analytics.component.html',
  styleUrls: ['./electron-analytics.component.css']
})
export class ElectronAnalyticsComponent {

  routerSubscription: Subscription;
  constructor(private router: Router, private electronService: ElectronService,
    private analyticsService: AnalyticsService) {

  }

  ngOnInit() {
    if (this.electronService.isElectron) {
      this.routerSubscription = this.router.events.pipe(filter(event => event instanceof NavigationEnd))
        .subscribe((event: NavigationEnd) => {
          this.analyticsService.sendAnalyticsPageView(event.urlAfterRedirects);
        });
    }
  }

  ngOnDestroy() {
    if(this.routerSubscription){
      this.routerSubscription.unsubscribe();
    }
  }
}
