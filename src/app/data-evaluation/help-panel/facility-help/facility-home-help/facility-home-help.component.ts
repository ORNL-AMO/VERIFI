import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Injector } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Component({
    selector: 'app-facility-home-help',
    templateUrl: './facility-home-help.component.html',
    styleUrls: ['./facility-home-help.component.css'],
    standalone: false
})
export class FacilityHomeHelpComponent {
  constructor(private injector: Injector) { }

  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  ngOnInit(): void {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }
}
