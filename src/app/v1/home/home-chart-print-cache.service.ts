import { inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { Injectable } from '@angular/core';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { PreviewDetails, PreviewIdentity } from '@app/v1/visualizations/preview/preview-registry';
type PrintContext = { definition: VisualizationDefinition; identity: PreviewIdentity };
/** Ready alternatives only, qualified by every committed input and workspace revision. */
@Injectable({ providedIn: 'root' })
export class HomeChartPrintCache {
  private account?: string;
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly entries = new Map<string, { details: PreviewDetails; snapshot: ReturnType<AccountWorkspaceStore['snapshot']> }>();
  private key(context: PrintContext): string { return JSON.stringify([context.identity, context.definition]); }
  set(context: PrintContext, details: PreviewDetails): void {
    if (this.account !== context.identity.accountGuid) { this.entries.clear(); this.account = context.identity.accountGuid; }
    this.entries.set(this.key(context), { details, snapshot: this.workspace.snapshot() });
    while (this.entries.size > 100) this.entries.delete(this.entries.keys().next().value!);
  }
  get(context: PrintContext): PreviewDetails | undefined { const entry = this.entries.get(this.key(context)); return entry?.snapshot === this.workspace.snapshot() ? entry?.details : undefined; }
}
