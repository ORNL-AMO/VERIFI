import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AnalysisGroup } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { FacilityAnalysisPeriodService } from '../../analysis-setup/facility-analysis-period.service';
import { FacilityAnalysisWorkbenchContext } from '../../facility-analysis-workbench-context.service';
import { FacilityAnalysisGroupContext } from '../facility-analysis-group-context.service';
import { FacilityAnalysisGroupShellComponent } from './facility-analysis-group-shell.component';

describe('FacilityAnalysisGroupShellComponent', () => {
  it('redirects an unavailable Banked Savings deep link to group Setup', () => {
    const navigate = vi.fn();
    const group = {
      idbGroupId: 'group-a', analysisType: 'absoluteEnergyConsumption', predictorVariables: [],
      applyBanking: true, bankedAnalysisYear: 2024, newBaselineYear: 2026
    } as AnalysisGroup;
    const analysis = {
      guid: 'analysis-a', facilityId: 'facility-a', analysisCategory: 'energy', energyIsSource: false,
      baselineYear: 2023, hasBanking: true, bankedAnalysisItemId: 'source', groups: [group]
    } as IdbAnalysisItem;
    const source = {
      ...analysis, guid: 'source', baselineYear: 2022, hasBanking: false,
      bankedAnalysisItemId: undefined, groups: [{ ...group, applyBanking: false }]
    } as IdbAnalysisItem;
    const context = {
      facility: signal({ guid: 'facility-a' }),
      analyses: signal([analysis, source]),
      status: { items: signal([]) }
    };
    const groupContext = {
      groupGuid: signal('group-a'), group: signal(group), meterGroup: signal({ guid: 'group-a' }),
      autosave: { draft: signal(analysis) }, workbench: context
    };
    TestBed.overrideComponent(FacilityAnalysisGroupShellComponent, {
      set: {
        template: '',
        providers: [
          { provide: FacilityAnalysisGroupContext, useValue: groupContext }
        ]
      }
    });
    TestBed.configureTestingModule({
      imports: [FacilityAnalysisGroupShellComponent],
      providers: [
        {
          provide: Router,
          useValue: {
            url: '/v1/workspace/facility/facility-a/analysis/workbench/analysis-a/group/group-a/banking',
            events: new Subject<NavigationEnd>(), navigate
          }
        },
        { provide: FacilityAnalysisWorkbenchContext, useValue: context },
        {
          provide: FacilityAnalysisPeriodService,
          useValue: { bankingLatestCompleteYears: () => ({ consumer: 2025, source: 2025 }) }
        }
      ]
    });

    TestBed.createComponent(FacilityAnalysisGroupShellComponent);
    TestBed.flushEffects();

    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'workbench', 'analysis-a',
      'group', 'group-a', 'setup'
    ], { replaceUrl: true });
  });
});
