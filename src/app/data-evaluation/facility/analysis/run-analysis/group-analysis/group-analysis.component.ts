import { Component, computed, effect, inject, Signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Params, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { AnalysisGroup } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalysisGroupValidationService } from 'src/app/shared/validation/services/analysis-group-validation.service';
import { GroupAnalysisErrors } from 'src/app/models/validation';
import { emptyGroupAnalysisErrors } from 'src/app/shared/validation/groupAnalysisValidation';
import { AnalysisService } from '../../analysis.service';

@Component({
  selector: 'app-group-analysis',
  templateUrl: './group-analysis.component.html',
  styleUrls: ['./group-analysis.component.css'],
  standalone: false
})
export class GroupAnalysisComponent {
  private activatedRoute: ActivatedRoute = inject(ActivatedRoute);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private router: Router = inject(Router);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);
  private analysisGroupValidationService: AnalysisGroupValidationService = inject(AnalysisGroupValidationService);
  private analysisService: AnalysisService = inject(AnalysisService);

  analysisItem: Signal<IdbAnalysisItem> = toSignal(this.analysisDbService.selectedAnalysisItem);
  params: Signal<Params> = toSignal(this.activatedRoute.params);
  selectedGroup: Signal<AnalysisGroup> = toSignal(this.analysisService.selectedGroup);

  // groupId: Signal<string> = computed(() => {
  //   const params = this.params();
  //   return params['id'];
  // });

  showModelSelection: Signal<boolean> = computed(() => {
    const selectedGroup = this.selectedGroup();
    return selectedGroup ? selectedGroup.analysisType == 'regression' : false;
  });
  showBanked: Signal<boolean> = computed(() => {
    const selectedGroup = this.selectedGroup();
    const analysisItem = this.analysisItem();
    if (selectedGroup && analysisItem) {
      return selectedGroup.applyBanking && analysisItem.hasBanking;
    }
    return false;
  });

  private url = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  label = computed(() => {
    const url = this.url();
    const group = this.selectedGroup();
    if (!group) return '';
    const groupName = this.utilityMeterGroupDbService.getGroupName(group.idbGroupId);
    if (url.includes('annual-analysis')) return groupName + ' Annual Analysis';
    if (url.includes('monthly-analysis')) return groupName + ' Monthly Analysis';
    if (url.includes('model-selection')) return groupName + ' Regression Model';
    return groupName + ' Setup';
  });

  hideLabel: Signal<boolean> = computed(() => {
    const url = this.url();
    return url.includes('banked-analysis');
  });

  allGroupErrors = toSignal(this.analysisGroupValidationService.allGroupErrors, { initialValue: [] });

  groupErrors: Signal<GroupAnalysisErrors> = computed(() => {
    const selectedGroup = this.selectedGroup();
    const allGroupErrors = this.allGroupErrors();
    const analysisItem = this.analysisItem();
    if (selectedGroup && analysisItem) {
      const groupError = allGroupErrors.find(groupError => {
        return groupError.groupId == selectedGroup.idbGroupId && groupError.analysisId == analysisItem.guid
      });
      if (groupError) {
        return groupError;
      } else {
        return emptyGroupAnalysisErrors();
      }
    }
    return emptyGroupAnalysisErrors();
  });

  constructor() {
    effect(() => {
      const params = this.params();
      const analysisItem = this.analysisItem();
      if (params['id']) {
        const groupId = params['id'];
        const group = analysisItem?.groups.find(group => group.idbGroupId == groupId);
        if (group) {
          this.analysisService.selectedGroup.next(group);
        } else {
          this.router.navigateByUrl('/data-evaluation/analysis/analysis-dashboard')
        }
      }
    })
  }
}
