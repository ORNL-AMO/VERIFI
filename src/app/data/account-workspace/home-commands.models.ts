import { HomeDashboardDefinition, HomeOwner, HomeOwnerState } from '@domain/home/home-dashboard';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { IdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { HomeGraphProposal } from '@data/home/home-template-graph';
import { WorkspaceWriteError } from './workspace-commands.models';

interface HomeCommandIdentity {
  readonly operationGuid: string;
  readonly accountGuid: string;
  readonly owner: HomeOwner;
  /** null means the owner record must not exist yet. */
  readonly expectedOwnerRevision: number | null;
}
export type HomeCommand = HomeCommandIdentity & (
  | { readonly kind: 'initialize'; readonly graph: HomeGraphProposal }
  | { readonly kind: 'create'; readonly graph: HomeGraphProposal }
  | { readonly kind: 'update'; readonly guid: string; readonly expectedRevision: number; readonly definition: HomeDashboardDefinition;
      /** Review is explicit; moving a blocked widget never verifies its reference. */
      readonly repairPaths?: readonly string[] }
  | { readonly kind: 'duplicate'; readonly guid: string; readonly sourceGuid: string; readonly expectedRevision: number;
      readonly name: string; readonly createdDate: string; readonly widgetIds: Readonly<Record<string, string>> }
  | { readonly kind: 'restore' | 'upgrade'; readonly guid: string; readonly expectedRevision: number; readonly graph: HomeGraphProposal }
  | { readonly kind: 'delete'; readonly guid: string; readonly expectedRevision: number }
  | { readonly kind: 'configure'; readonly state: HomeOwnerState }
);
export interface HomeCommandValue {
  readonly owner: IdbHomeOwner;
  readonly dashboard?: IdbHomeDashboard;
  readonly changed: boolean;
  readonly skipped?: 'protected' | 'initialized';
}
export type HomeCommandOutcome =
  | { readonly state: 'committed' | 'unchanged'; readonly command: HomeCommand; readonly value: HomeCommandValue }
  | { readonly state: 'conflict'; readonly command: HomeCommand; readonly error: HomeConflictError }
  | { readonly state: 'failed' | 'refresh-required'; readonly command: HomeCommand; readonly error: unknown };
export class HomeConflictError extends WorkspaceWriteError {
  constructor(readonly currentOwner?: IdbHomeOwner, readonly currentDashboard?: IdbHomeDashboard) {
    super('validation-failed', 'This Home dashboard or owner configuration changed. Review the saved and proposed versions.');
    this.name = 'HomeConflictError';
  }
}
