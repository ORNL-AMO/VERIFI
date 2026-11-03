import { InjectionToken, Provider, Signal, Type } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Params } from '@angular/router';
import { DataWorkbenchResource } from '@app/v1/shared/data-workbench/data-workbench-resource-switcher.component';
import { PageBreadcrumb } from '@app/v1/shared/page-identity/page-identity.component';
import { AnalysisChecksWorkflow } from '../analysis-checks/analysis-checks.models';
import { ReportWorkbenchEditor } from '../editing/report-autosave-controller';
import { ReportConfigurationStatus, ReportIdentity } from '../report.models';
import { ReportStageId, ReportWorkbenchStage } from './report-workbench.models';

export interface ReportEditor extends ReportWorkbenchEditor {
  readonly name: FormControl<string>;
  readonly needsProtection: Signal<boolean>;
  readonly setupValid: Signal<boolean>;
  readonly canEdit: Signal<boolean>;
  flush(): Promise<boolean>;
}

export interface ReportRuntime {
  readonly editor: ReportEditor;
  readonly checks?: { readonly workflow: Signal<AnalysisChecksWorkflow>; confirmReview(): Promise<void> };
  /** Pending facility formats retain their supported name-only editing. */
  readonly gateSetup: boolean;
  readonly showOutputActions: boolean;
}

export interface ReportFeatureDefinition {
  readonly type: string;
  readonly providers: readonly Provider[];
  readonly stages: Readonly<Partial<Record<ReportStageId, Type<unknown>>>>;
}

export interface ReportLink { readonly route: readonly string[]; readonly queryParams?: Params; }
export interface ReportHostPresentation {
  readonly name: string;
  readonly typeLabel: string;
  readonly breadcrumbs: readonly PageBreadcrumb[];
  readonly breadcrumbLabel: string;
  readonly titleId: string;
  readonly resources: readonly DataWorkbenchResource[];
  readonly selectedId: string;
  readonly status: ReportConfigurationStatus;
  readonly statusLabel: string;
  readonly facts: readonly { readonly label: string; readonly value: string }[];
}

export interface ReportHostAdapter {
  readonly identity: Signal<ReportIdentity | undefined>;
  readonly stage: Signal<ReportStageId>;
  readonly stages: Signal<readonly ReportWorkbenchStage[]>;
  readonly presentation: Signal<ReportHostPresentation | undefined>;
  readonly state: Signal<'loading' | 'error' | 'unavailable' | 'ready'>;
  readonly error: Signal<string | undefined>;
  readonly returnLink: Signal<ReportLink>;
  readonly definitions: readonly ReportFeatureDefinition[];
  readonly fallback: ReportFeatureDefinition;
  type(): string | undefined;
  providers(identity: ReportIdentity): Provider[];
  reportLink(guid: string, stage?: ReportStageId): ReportLink;
}

export const REPORT_HOST = new InjectionToken<ReportHostAdapter>('Report host');
export const REPORT_RUNTIME = new InjectionToken<ReportRuntime>('Active report runtime');
export const REPORT_SESSION_IDENTITY = new InjectionToken<ReportIdentity>('Immutable report session identity');

export function reportIdentityKey(identity: ReportIdentity): string {
  return JSON.stringify([identity.scope, identity.accountGuid,
    identity.scope === 'facility' ? identity.facilityGuid : null, identity.reportGuid]);
}
