import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { AccountDataModule } from '../../account-data.module';
import { AccountPortfolioAnalysesTabComponent } from './account-portfolio-analyses-tab.component';

describe('AccountPortfolioAnalysesTabComponent', () => {
  it('renders read-only facility analysis cards and opens the owning facility workbench', () => {
    const fixture = setup([
      analysis('analysis-energy', 'Energy performance', 'facility-a', 'energy'),
      analysis('analysis-water', 'Water performance', 'facility-b', 'water')
    ]);
    const router = TestBed.inject(Router) as unknown as { navigate: ReturnType<typeof vi.fn> };

    fixture.detectChanges();

    expect(cardTitles(fixture)).toEqual(['Energy performance', 'Water performance']);
    expect(Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-resource-browse-card__owner'))
      .map(owner => owner.textContent?.trim())).toEqual(['Alpha Plant', 'Beta Works']);
    expect(fixture.nativeElement.querySelectorAll('.v1-resource-browse-card__actions')).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('Active for Reporting');
    expect(fixture.nativeElement.textContent).toContain('Baseline');
    expect(fixture.nativeElement.textContent).toContain('Basis and units');
    expect(fixture.nativeElement.textContent).toContain('Groups');
    expect(fixture.nativeElement.textContent).not.toContain('Latest full year');

    (fixture.nativeElement.querySelector('[aria-label="Open Water performance"]') as HTMLButtonElement).click();

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'facility', 'facility-b', 'analysis', 'workbench', 'analysis-water', 'setup'
    ]);
  });

  it('shows the analysis empty state when the account has no facility analyses', () => {
    const fixture = setup([]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-data-empty-state')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No analyses');
    expect(fixture.nativeElement.querySelectorAll('app-resource-browse-card')).toHaveLength(0);
  });

  it('filters and sorts analyses across facilities with the shared browse controls', () => {
    const fixture = setup([
      analysis('analysis-energy', 'Zulu Energy', 'facility-a', 'energy'),
      analysis('analysis-water', 'Alpha Water', 'facility-b', 'water')
    ]);

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('select.v1-select')).toHaveLength(3);
    expect(cardTitles(fixture)).toEqual(['Zulu Energy', 'Alpha Water']);

    fixture.componentInstance.filtersForm.controls.search.setValue('beta');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Alpha Water']);

    fixture.componentInstance.filtersForm.controls.search.setValue('');
    fixture.componentInstance.filtersForm.controls.category.setValue('energy');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Zulu Energy']);

    fixture.componentInstance.filtersForm.controls.category.setValue('all');
    fixture.componentInstance.filtersForm.controls.status.setValue('active');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Zulu Energy']);

    fixture.componentInstance.filtersForm.controls.status.setValue('all');
    fixture.componentInstance.filtersForm.controls.sort.setValue('name');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Alpha Water', 'Zulu Energy']);

    fixture.componentInstance.filtersForm.controls.search.setValue('no matching analysis');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No analyses match these filters');
  });
});

function setup(analyses: IdbAnalysisItem[]): ComponentFixture<AccountPortfolioAnalysesTabComponent> {
  TestBed.configureTestingModule({
    imports: [AccountDataModule],
    providers: [
      {
        provide: AccountWorkspaceStore,
        useValue: {
          facilities: signal([
            facility('facility-a', 'Alpha Plant', 'analysis-energy'),
            facility('facility-b', 'Beta Works')
          ]),
          facilityAnalyses: signal(analyses),
          accountAnalyses: signal([]),
          facilityReports: signal([]),
          meterGroups: signal([])
        }
      },
      { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          facilityAnalysisWorkbenchRoute: (facilityGuid: string, analysisGuid: string, tab = 'setup') => [
            '/v1', 'workspace', 'facility', facilityGuid, 'analysis', 'workbench', analysisGuid, tab
          ]
        }
      },
      { provide: Router, useValue: { navigate: vi.fn(async () => true) } }
    ]
  });

  return TestBed.createComponent(AccountPortfolioAnalysesTabComponent);
}

function cardTitles(fixture: ComponentFixture<AccountPortfolioAnalysesTabComponent>): string[] {
  return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-resource-browse-card__title-text'))
    .map(element => element.textContent!.trim());
}

function facility(guid: string, name: string, selectedEnergyAnalysisId?: string): IdbFacility {
  return { guid, accountId: 'account-a', name, selectedEnergyAnalysisId } as IdbFacility;
}

function analysis(
  guid: string,
  name: string,
  facilityId: string,
  analysisCategory: 'energy' | 'water'
): IdbAnalysisItem {
  return {
    guid,
    accountId: 'account-a',
    facilityId,
    name,
    analysisCategory,
    energyIsSource: false,
    energyUnit: 'MMBtu',
    waterUnit: 'gal',
    groups: [],
    baselineYear: 2022,
    hasBanking: false,
    bankedAnalysisItemId: undefined,
    modifiedDate: new Date('2026-10-09')
  } as IdbAnalysisItem;
}
