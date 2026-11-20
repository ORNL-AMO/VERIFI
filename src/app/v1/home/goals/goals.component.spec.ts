import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { HomeModule } from '../home.module';
import { HomeContext } from '../home-context.service';
import { HomeGoalsComponent } from './goals.component';
import { homeSnapshot } from '../testing/home-testing';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisDataSession } from '@app/v1/visualizations/analysis/analysis-data-session.service';

describe('Home goal demand', () => {
  it('includes every owned facility independently of account chart membership and drops late results', async () => {
    const initial = homeSnapshot(), first = initial.facilities[0];
    const analysis = {...getNewIdbAnalysisItem(initial.account, first, [], [], 'energy'), guid: 'analysis'};
    const snapshot = signal({...initial, facilityAnalyses: [analysis], facilities: [{...first, selectedEnergyAnalysisId: 'analysis'},
      {...getNewIdbFacility(initial.account), guid: 'empty', name: 'No analysis'}]});
    let finish!: (value: any) => void;
    const acquire = vi.fn(() => new Promise<any>(resolve => finish = resolve));
    TestBed.configureTestingModule({imports: [HomeModule], providers: [provideRouter([]),
      {provide: HomeContext, useValue: {owner: () => ({kind: 'account', guid: 'account-a'}), selectedGuid: () => 'board', workspace: {
        snapshot, revision: () => 1, isReady: () => true}}},
      {provide: AnalysisDataSession, useValue: {acquire}}
    ]});
    const fixture = TestBed.createComponent(HomeGoalsComponent);
    fixture.componentRef.setInput('widget', {id: 'progress', kind: 'table', settings: {view: 'facility-progress', measure: 'energy', categories: ['energy', 'water'], period: 'latest-result'}});
    fixture.detectChanges(); expect(fixture.componentInstance.contexts()).toHaveLength(4); expect(acquire).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(fixture.nativeElement.textContent).toContain('No analysis');
    snapshot.set({...snapshot(), facilities: snapshot().facilities.map(f => ({...f, selectedEnergyAnalysisId: undefined}))}); fixture.detectChanges();
    finish({state: 'error', message: 'obsolete failure'}); await Promise.resolve(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('obsolete failure'); expect(fixture.componentInstance.results()).toEqual({}); fixture.destroy();
  });
});
