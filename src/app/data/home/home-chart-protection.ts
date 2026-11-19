import type { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { readHomeDashboard } from './home-record';

/** Called inside the chart mutation transaction; returning to an old chart value cannot clear this flag. */
export async function protectLinkedHomeDashboards(tx: IndexedDbTransactionContext, accountGuid: string, chartGuid: string): Promise<IdbHomeDashboard[]> {
  const dashboards = await tx.getAllByIndex<IdbHomeDashboard>('homeDashboards', 'accountId', accountGuid);
  const changed: IdbHomeDashboard[] = [];
  for (const dashboard of dashboards) {
    if (!dashboard.template || dashboard.template.customized) continue;
    const read = readHomeDashboard(dashboard);
    if (read.state !== 'valid' || !read.value.widgets.some(widget => widget.kind === 'visualization' && widget.visualizationGuid === chartGuid)) continue;
    const next = { ...dashboard, revision: dashboard.revision + 1, modifiedDate: new Date(), template: { ...dashboard.template, customized: true } };
    await tx.put('homeDashboards', next);
    changed.push(next);
  }
  return changed;
}
