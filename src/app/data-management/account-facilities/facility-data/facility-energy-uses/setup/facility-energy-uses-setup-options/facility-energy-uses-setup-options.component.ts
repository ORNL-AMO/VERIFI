import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, computed, inject, Injector } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
  selector: 'app-facility-energy-uses-setup-options',
  standalone: false,
  templateUrl: './facility-energy-uses-setup-options.component.html',
  styleUrl: './facility-energy-uses-setup-options.component.css',
})
export class FacilityEnergyUsesSetupOptionsComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  facility: IdbFacility;
  facilitySub: Subscription;
  facilityEnergyUseGroupsSub: Subscription;
  hasChildRoute: boolean;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private injector: Injector

  ) { }

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setHasChildRoute();
      }
    });
    this.setHasChildRoute();

    this.facilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
      this.facility = facility;
    });
    this.facilityEnergyUseGroupsSub = toObservable(computed(() => [...this.accountWorkspaceStore.facilityEnergyUseGroups()]), { injector: this.injector }).subscribe(groups => {
      if (groups && groups.length == 0 && !this.hasChildRoute) {
        this.setupNewGroups();
      }
    });


  }

  ngOnDestroy() {
    this.facilitySub.unsubscribe();
    this.facilityEnergyUseGroupsSub.unsubscribe();
  }

  setHasChildRoute() {
    this.hasChildRoute = this.route.firstChild != null;
  }

  leaveGroupSetup() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  setupNewGroups() {
    this.router.navigate(['./new-groups'], { relativeTo: this.route });
  }

  editExistingGroups() {
    this.router.navigate(['./edit-groups'], { relativeTo: this.route });
  }

  addYearOfData() {
    this.router.navigate(['./add-year'], { relativeTo: this.route });
  }
}
