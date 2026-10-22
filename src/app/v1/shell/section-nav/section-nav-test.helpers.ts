import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { MeterSource } from '@data/models/constantsAndTypes';
import { StatusItem } from '@app/v1/status/status.models';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkspaceNavigationService } from '../workspace-navigation.service';
import { SectionNavModule } from './section-nav.module';
import { SectionNavDisclosureService } from './section-nav-disclosure.service';


export function setupSectionNavTest() {
  let activeSection: ReturnType<typeof signal<string>>;
  let contextMode: ReturnType<typeof signal<string>>;
  let facilities: ReturnType<typeof signal<ReadonlyArray<{ guid: string; name: string }>>>;
  let selectedFacility: ReturnType<typeof signal<{
    guid: string;
    name: string;
    selectedEnergyAnalysisId?: string;
    selectedWaterAnalysisId?: string;
  } | undefined>>;
  let account: ReturnType<typeof signal<{ guid: string; name: string; isSingleFacilityCompany?: boolean; displayEmissions?: boolean; selectedEnergyAnalysisId?: string; selectedWaterAnalysisId?: string }>>;
  let isSingleSiteWorkspace: ReturnType<typeof signal<boolean>>;
  let hasSingleSiteRecovery: ReturnType<typeof signal<boolean>>;
  let singleSiteWorkspaceState: ReturnType<typeof signal<string>>;
  const activePortfolioTab = signal('facilities');
  let activeDetail: ReturnType<typeof signal<string>>;
  let activeMeterGuid: ReturnType<typeof signal<string | undefined>>;
  let activeMeterGroupGuid: ReturnType<typeof signal<string | undefined>>;
  let activePredictorGuid: ReturnType<typeof signal<string | undefined>>;
  let activeWeatherPredictorGroupKey: ReturnType<typeof signal<string | undefined>>;
  let activeImportFileId: ReturnType<typeof signal<string | undefined>>;
  let activeImportStep: ReturnType<typeof signal<string | undefined>>;
  let activeAnalysisGuid: ReturnType<typeof signal<string | undefined>>;
  let activeAnalysisGroupGuid: ReturnType<typeof signal<string | undefined>>;
  let activeAnalysisStageScope: ReturnType<typeof signal<'analysis' | 'group' | 'facility' | 'used-by' | undefined>>;
  let activeAccountAnalysisStageScope: ReturnType<typeof signal<'setup' | 'select-items' | 'results' | 'used-by' | undefined>>;
  let facilityMeters: ReturnType<typeof signal<Array<{ guid: string; name: string; source: MeterSource }>>>;
  let facilityMeterGroups: ReturnType<typeof signal<Array<{ guid: string; name: string }>>>;
  let facilityPredictors: ReturnType<typeof signal<Array<any>>>;
  let facilityPredictorData: ReturnType<typeof signal<Array<any>>>;
  let selectedFacilityAnalyses: ReturnType<typeof signal<Array<any>>>;
  let accountAnalyses: ReturnType<typeof signal<Array<any>>>;
  let setFacility: ReturnType<typeof vi.fn>;
  let statusState: ReturnType<typeof signal<'ready' | 'evaluating' | 'error' | 'idle'>>;
  let statusItems: ReturnType<typeof signal<StatusItem[]>>;

    activeSection = signal('home');
    contextMode = signal('account');
    facilities = signal([]);
    selectedFacility = signal<{
      guid: string;
      name: string;
      selectedEnergyAnalysisId?: string;
      selectedWaterAnalysisId?: string;
    } | undefined>(undefined);
    account = signal({ guid: 'account-a', name: 'Account A' });
    isSingleSiteWorkspace = signal(false);
    hasSingleSiteRecovery = signal(false);
    singleSiteWorkspaceState = signal('portfolio');
    activeDetail = signal('profile');
    activeMeterGuid = signal<string | undefined>(undefined);
    activeMeterGroupGuid = signal<string | undefined>(undefined);
    activePredictorGuid = signal<string | undefined>(undefined);
    activeWeatherPredictorGroupKey = signal<string | undefined>(undefined);
    activeImportFileId = signal<string | undefined>(undefined);
    activeImportStep = signal<string | undefined>(undefined);
    activeAnalysisGuid = signal<string | undefined>(undefined);
    activeAnalysisGroupGuid = signal<string | undefined>(undefined);
    activeAnalysisStageScope = signal<'analysis' | 'group' | 'facility' | 'used-by' | undefined>(undefined);
    activeAccountAnalysisStageScope = signal<'setup' | 'select-items' | 'results' | 'used-by' | undefined>(undefined);
    facilityMeters = signal([]);
    facilityMeterGroups = signal([]);
    facilityPredictors = signal([]);
    facilityPredictorData = signal([]);
    selectedFacilityAnalyses = signal([]);
    accountAnalyses = signal([]);
    setFacility = vi.fn();
    statusState = signal<'ready' | 'evaluating' | 'error' | 'idle'>('ready');
    statusItems = signal([]);
    TestBed.configureTestingModule({
      imports: [RouterModule.forRoot([]), SectionNavModule],
      providers: [
        SectionNavDisclosureService,
        {
          provide: WorkspaceNavigationService,
          useValue: {
            contextMode,
            facilities,
            facility: selectedFacility,
            account,
            isSingleSiteWorkspace,
            hasSingleSiteRecovery,
            singleSiteWorkspaceState,
            activeSection,
            activeDetail,
            activePortfolioTab,
            accountPortfolioRoute: (guid: string, tab: string) => ['/v1', 'workspace', 'account', guid, 'data', 'portfolio', tab],
            activeMeterGuid,
            activeMeterGroupGuid,
            activePredictorGuid,
            activeWeatherPredictorGroupKey,
            activeImportFileId,
            activeImportStep,
            activeAnalysisGuid,
            activeAnalysisGroupGuid,
            activeAnalysisStageScope,
            activeAccountAnalysisStageScope,
            accountRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'home', 'overview'],
            facilityRoute: () => ['/v1', 'workspace', 'facility', 'facility-a', 'home', 'overview'],
            accountDataRoute: (_accountGuid: string, detail = 'portfolio') => ['/v1', 'workspace', 'account', 'account-a', 'data', detail],
            accountImportsRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'imports', 'upload'],
            facilityDataRoute: (_facilityGuid: string, detail = 'meters') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', detail],
            facilityMeterRoute: (_facilityGuid: string, meterGuid: string, tab = 'settings') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meters', meterGuid, tab],
            facilityMeterGroupRoute: (_facilityGuid: string, groupGuid: string, tab = 'monthly-table') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'meter-grouping', groupGuid, tab],
            facilityPredictorRoute: (_facilityGuid: string, predictorGuid: string, tab = 'settings') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors', predictorGuid, tab],
            facilityWeatherPredictorRoute: (_facilityGuid: string, groupKey: string, tab = 'setup') => ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'predictors', 'weather', groupKey, tab],
            accountAnalysisRoute: () => ['/v1', 'workspace', 'account', 'account-a', 'analysis', 'dashboard'],
            accountAnalysisWorkbenchRoute: (_accountGuid: string, analysisGuid: string, tab = 'setup') =>
              ['/v1', 'workspace', 'account', 'account-a', 'analysis', 'workbench', analysisGuid, tab],
            facilityAnalysisRoute: () => ['/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'dashboard'],
            facilityAnalysisWorkbenchRoute: (_facilityGuid: string, analysisGuid: string, tab = 'setup') =>
              ['/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'workbench', analysisGuid, tab],
            accountSettingsRoute: (_accountGuid: string, detail = 'profile') => ['/v1', 'workspace', 'account', 'account-a', 'settings', detail],
            facilitySettingsRoute: (_facilityGuid: string, detail = 'profile') => ['/v1', 'workspace', 'facility', 'facility-a', 'settings', detail],
            legacyFacilityManagementRoute: () => ['/data-management', 'account-a', 'facilities'],
            setContext: () => undefined, accountReturn: signal(undefined), contextNavigationError: signal(''),
            setFacility
          }
        },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            meters: facilityMeters,
            facilityMeters,
            facilityMeterGroups,
            facilityPredictors,
            facilityPredictorData,
            selectedFacilityAnalyses,
            accountAnalyses,
            facilities,
            facilityAnalyses: signal([])
          }
        },
        {
          provide: WorkspaceStatusService,
          useValue: {
            state: statusState,
            items: statusItems,
            meterFindings: (meterGuid: string) => statusItems().filter(item => item.entity.guid === meterGuid),
            predictorFindings: (predictorGuid: string) => statusItems().filter(item => item.entity.guid === predictorGuid)
          }
        }
      ]
    });

  return { activePortfolioTab, activeSection, contextMode, facilities, selectedFacility, account, isSingleSiteWorkspace, hasSingleSiteRecovery, singleSiteWorkspaceState, activeDetail, activeMeterGuid, activeMeterGroupGuid, activePredictorGuid, activeWeatherPredictorGroupKey, activeImportFileId, activeImportStep, activeAnalysisGuid, activeAnalysisGroupGuid, activeAnalysisStageScope, activeAccountAnalysisStageScope, facilityMeters, facilityMeterGroups, facilityPredictors, facilityPredictorData, selectedFacilityAnalyses, accountAnalyses, setFacility, statusState, statusItems };
}

export function activeLinks(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from<HTMLAnchorElement>(element.querySelectorAll('.v1-nav__group a.active'));
  }

export function meterChildLinks(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from<HTMLAnchorElement>(element.querySelectorAll('.v1-nav__child'));
  }

export function groupChildLinks(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from<HTMLAnchorElement>(element.querySelectorAll('[aria-label="Meter group links"] .v1-nav__child'));
  }

export function predictorChildLinks(element: HTMLElement): HTMLAnchorElement[] {
    return Array.from<HTMLAnchorElement>(element.querySelectorAll('[aria-label="Predictor links"] .v1-nav__child'));
  }

export function meterNav(guid: string, name: string, source: MeterSource = 'Electricity'): { guid: string; name: string; source: MeterSource } {
    return { guid, name, source };
  }

export function analysisNav(guid: string, name: string, analysisCategory: 'energy' | 'water'): {
    guid: string;
    name: string;
    analysisCategory: 'energy' | 'water';
    groups: [];
  } {
    return { guid, name, analysisCategory, groups: [] };
  }
