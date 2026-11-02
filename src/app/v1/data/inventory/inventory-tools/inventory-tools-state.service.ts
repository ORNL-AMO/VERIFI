import { Injectable } from '@angular/core';
import { InventoryChartSheetView } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { MeterChartGrouping } from '@app/v1/shared/charts/inventory-meter-charts/inventory-meter-charts';
export interface InventoryToolsView { grouping: MeterChartGrouping; multiplePredictors: boolean; view: InventoryChartSheetView; zoom: { start: number; end: number }; }
@Injectable({ providedIn: 'root' })
export class InventoryToolsStateService {
  private readonly views = new Map<string, InventoryToolsView>();
  read(key: string): InventoryToolsView | undefined { const value = this.views.get(key); return value ? structuredClone(value) : undefined; }
  save(key: string, value: InventoryToolsView): void { this.views.set(key, structuredClone(value)); }
}
