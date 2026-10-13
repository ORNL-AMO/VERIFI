import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
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

    (fixture.nativeElement.querySelector('[aria-label="Open Water performance, facility analysis for Beta Works"]') as HTMLButtonElement).click();

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
    expect(fixture.nativeElement.querySelectorAll('select.v1-select')).toHaveLength(4);
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
  it('distinguishes account and facility summary cards and opens the owning account workbench', () => {
    const fixture = setup([analysis('analysis-energy', 'Plant energy', 'facility-a', 'energy')], [accountAnalysis('account-energy', 'Corporate energy')]);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(cardTitles(fixture)).toEqual(['Corporate energy', 'Plant energy']);
    const cards = host.querySelectorAll('app-resource-browse-card');
    expect(cards[0].textContent).toContain('Account analysis');
    expect(cards[0].textContent).toContain('Portfolio Company');
    expect(cards[0].textContent).toContain('Facility selections');
    expect(cards[1].textContent).toContain('Facility analysis');
    expect(cards[1].textContent).toContain('Alpha Plant');
    expect(host.textContent).not.toContain('Latest full year');
    expect(host.textContent).toContain('Showing 2 of 2 analyses');
    const owners = host.querySelectorAll<HTMLElement>('.v1-resource-browse-card__owner');
    expect(owners[0].style.getPropertyValue('--v1-resource-owner-accent')).toBe('var(--v1-account)');
    expect(owners[1].style.getPropertyValue('--v1-resource-owner-accent')).toBe('var(--v1-facility)');
    expect(host.querySelectorAll('.v1-resource-browse-card__actions')).toHaveLength(0);
    host.querySelector<HTMLButtonElement>('[aria-label="Open Corporate energy, account analysis for Portfolio Company"]')?.click();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', 'account-energy', 'setup'
    ]);
  });

  it('combines scope and search without clearing the query, including account facility selections', () => {
    const fixture = setup([
      analysis('analysis-energy', 'Plant energy', 'facility-a', 'energy'),
      analysis('analysis-water', 'Plant water', 'facility-b', 'water')
    ], [accountAnalysis('account-energy', 'Corporate energy')]);
    const controls = fixture.componentInstance.filtersForm.controls;
    controls.search.setValue('  ALPHA  ');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Corporate energy', 'Plant energy']);
    controls.scope.setValue('account');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Corporate energy']);
    controls.scope.setValue('facility');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Plant energy']);
    expect(controls.search.value).toBe('  ALPHA  ');
    controls.category.setValue('water');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No analyses match these filters');
    controls.search.setValue('beta');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Plant water']);
    controls.scope.setValue('account');
    controls.search.setValue('portfolio company');
    controls.category.setValue('energy');
    controls.status.setValue('active');
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Corporate energy']);
  });

  it('updates mixed-scope cards and keeps duplicate names and GUIDs distinct by scope', () => {
    const fixture = setup([analysis('shared-guid', 'Same name', 'facility-a', 'energy')], [accountAnalysis('shared-guid', 'Same name')]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-resource-browse-card')).toHaveLength(2);
    const workspace = TestBed.inject(AccountWorkspaceStore);
    (workspace.accountAnalyses as ReturnType<typeof signal<IdbAccountAnalysisItem[]>>).set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-resource-browse-card')).toHaveLength(1);
    fixture.componentInstance.filtersForm.controls.scope.setValue('account');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No analyses match these filters');
  });

  it('hides internal account pairs for single-facility accounts', () => {
    const fixture = setup([analysis('analysis-energy', 'Plant energy', 'facility-a', 'energy')], [accountAnalysis('account-energy', 'Hidden pair')]);
    const workspace = TestBed.inject(AccountWorkspaceStore);
    (workspace.account as ReturnType<typeof signal<IdbAccount | undefined>>).set({ guid: 'account-a', name: 'Single', isSingleFacilityCompany: true } as IdbAccount);
    fixture.detectChanges();
    expect(cardTitles(fixture)).toEqual(['Plant energy']);
  });

});

function setup(analyses: IdbAnalysisItem[], accountAnalyses: IdbAccountAnalysisItem[] = []): ComponentFixture<AccountPortfolioAnalysesTabComponent> {
  TestBed.configureTestingModule({
    imports: [AccountDataModule],
    providers: [
      {
        provide: AccountWorkspaceStore,
        useValue: {
          account: signal({ guid: 'account-a', name: 'Portfolio Company', selectedEnergyAnalysisId: 'account-energy' } as IdbAccount),
          accountReports: signal([]),
          facilities: signal([
            facility('facility-a', 'Alpha Plant', 'analysis-energy'),
            facility('facility-b', 'Beta Works')
          ]),
          facilityAnalyses: signal(analyses),
          accountAnalyses: signal(accountAnalyses),
          facilityReports: signal([]),
          meterGroups: signal([])
        }
      },
      { provide: WorkspaceStatusService, useValue: { items: signal([]), state: signal('ready') } },
      {
        provide: WorkspaceNavigationService,
        useValue: {
          accountAnalysisWorkbenchRoute: (accountGuid: string, analysisGuid: string, tab = 'setup') => [
            '/v1', 'workspace', 'account', accountGuid, 'analysis', 'workbench', analysisGuid, tab
          ],
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

function accountAnalysis(guid: string, name: string): IdbAccountAnalysisItem {
  return {
    guid, accountId: 'account-a', name, analysisCategory: 'energy', baselineYear: 2022,
    energyIsSource: false, energyUnit: 'MMBtu', waterUnit: 'gal', modifiedDate: new Date('2026-10-09'),
    facilityAnalysisItems: [
      { facilityId: 'facility-a', analysisItemId: 'analysis-energy' },
      { facilityId: 'facility-b', analysisItemId: 'skip' }
    ]
  } as IdbAccountAnalysisItem;
}
