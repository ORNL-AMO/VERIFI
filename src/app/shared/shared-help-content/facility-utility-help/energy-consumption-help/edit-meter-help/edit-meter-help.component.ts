import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-edit-meter-help',
    templateUrl: './edit-meter-help.component.html',
    styleUrls: ['./edit-meter-help.component.css'],
    standalone: false
})
export class EditMeterHelpComponent {

  routerSub: Subscription;
  isEdit: boolean;
  constructor(private router: Router) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.setIsEdit(val.url);
      }
    });
    this.setIsEdit(this.router.url);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  setIsEdit(url: string) {
    this.isEdit = url.includes('edit-meter') || url.includes('data-management');
  }
}
