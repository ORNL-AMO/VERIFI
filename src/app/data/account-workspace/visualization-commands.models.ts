import { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { VisualizationReferenceIssue } from '@domain/visualizations/visualization-references';
import { IdbSavedVisualization } from '@data/models/idbModels/saved-visualization';
import { WorkspaceWriteError } from './workspace-commands.models';

interface VisualizationCommandIdentity {
  readonly accountGuid: string;
  readonly guid: string;
}

export interface CreateVisualizationCommand extends VisualizationCommandIdentity {
  readonly kind: 'create';
  readonly definition: VisualizationDefinition;
  readonly createdDate: string;
}

export interface DuplicateVisualizationCommand extends VisualizationCommandIdentity {
  readonly kind: 'duplicate';
  readonly sourceGuid: string;
  readonly expectedRevision: number;
  readonly definition: VisualizationDefinition;
  readonly createdDate: string;
}

export interface UpdateVisualizationCommand extends VisualizationCommandIdentity {
  readonly kind: 'update';
  readonly expectedRevision: number;
  readonly definition: VisualizationDefinition;
  /** Explicit reviewed repair permits replacing a locked payload; never inferred from source availability. */
  readonly repair?: { readonly acknowledgeTransfer: boolean; readonly referencePaths: readonly string[] };
}

export interface DeleteVisualizationCommand extends VisualizationCommandIdentity {
  readonly kind: 'delete';
  readonly expectedRevision: number;
}

export type VisualizationCommand = CreateVisualizationCommand | DuplicateVisualizationCommand
  | UpdateVisualizationCommand | DeleteVisualizationCommand;

export type VisualizationCommandOutcome =
  | { readonly state: 'committed'; readonly command: VisualizationCommand; readonly value: IdbSavedVisualization | undefined;
      readonly referenceIssues: readonly VisualizationReferenceIssue[] }
  | { readonly state: 'conflict'; readonly command: VisualizationCommand; readonly current?: IdbSavedVisualization; readonly error: VisualizationConflictError }
  | { readonly state: 'failed' | 'refresh-required'; readonly command: VisualizationCommand; readonly error: unknown };

export class VisualizationConflictError extends WorkspaceWriteError {
  constructor(readonly current: IdbSavedVisualization | undefined) {
    super('validation-failed', 'This visualization changed or was deleted. Review the saved and local versions before continuing.');
    this.name = 'VisualizationConflictError';
  }
}
