import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { AccountDataModule } from '../../account-data.module';
import { AccountPortfolioPredictorsTabComponent } from './account-portfolio-predictors-tab.component';

describe('AccountPortfolioPredictorsTabComponent', () => {
  it('renders account-wide predictor cards and opens the owning facility workspace', () => {
    const navigate = vi.fn(async () => true);
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        {
          provide: AccountWorkspaceStore,
          useValue: {
            facilities: signal([
              facility('facility-a', 'Alpha Plant'),
              facility('facility-b', 'Beta Works')
            ]),
            predictors: signal([
              predictor('predictor-production', 'Production', 'facility-a', true),
              predictor('predictor-weather', 'HDD Generated', 'facility-b', false, 'Weather')
            ]),
            predictorData: signal([
              { guid: 'reading-a', predictorId: 'predictor-production', facilityId: 'facility-a', year: 2026, month: 1 }
            ])
          }
        },
        {
          provide: WorkspaceNavigationService,
          useValue: {
            facilityPredictorRoute: (facilityGuid: string, predictorGuid: string, tab = 'settings') => [
              '/v1', 'workspace', 'facility', facilityGuid, 'data', 'predictors', predictorGuid, tab
            ]
          }
        },
        { provide: Router, useValue: { navigate } }
      ]
    });
    const fixture = TestBed.createComponent(AccountPortfolioPredictorsTabComponent);
    fixture.detectChanges();

    expect(cardTitles(fixture)).toEqual(['Production', 'HDD Generated']);
    expect(fixture.nativeElement.textContent).toContain('Alpha Plant');
    expect(fixture.nativeElement.textContent).toContain('Beta Works');

    (fixture.nativeElement.querySelector('[aria-label="Open HDD Generated settings"]') as HTMLButtonElement).click();
    expect(navigate).toHaveBeenCalledWith([
      '/v1', 'workspace', 'facility', 'facility-b', 'data', 'predictors', 'predictor-weather', 'settings'
    ]);
  });
});

function cardTitles(fixture: ComponentFixture<AccountPortfolioPredictorsTabComponent>): string[] {
  return Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.v1-resource-browse-card__title-text'))
    .map(element => element.textContent!.trim());
}

function facility(guid: string, name: string): IdbFacility {
  return { guid, accountId: 'account-a', name } as IdbFacility;
}

function predictor(
  guid: string,
  name: string,
  facilityId: string,
  production: boolean,
  predictorType: 'Standard' | 'Weather' = 'Standard'
): any {
  return {
    guid,
    accountId: 'account-a',
    facilityId,
    name,
    production,
    predictorType,
    weatherDataType: predictorType === 'Weather' ? 'HDD' : undefined,
    unit: predictorType === 'Weather' ? 'HDD' : 'tons'
  };
}
