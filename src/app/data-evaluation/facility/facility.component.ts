import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { DataEvaluationService } from '../data-evaluation.service';

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css'],
  standalone: false
})
export class FacilityComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  print: boolean;
  printSub: Subscription;
  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private dataEvaluationService: DataEvaluationService
  ) { }

  ngOnInit(): void {
    this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility).subscribe(val => {
      this.selectedFacility = val;
    });
    this.activatedRoute.params.subscribe(params => {
      let facilityId: string = params['id'];
      let facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
      let selectedFacility: IdbFacility = facilities.find(facility => { return facility.guid == facilityId });
      if (selectedFacility) {
        this.accountWorkspaceService.selectFacility(selectedFacility.guid);
      } else {
        this.router.navigateByUrl('/data-evaluation/account')
      }
    });

    this.printSub = this.dataEvaluationService.print.subscribe(print => {
      this.print = print;
    })
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.printSub.unsubscribe();
  }
}
