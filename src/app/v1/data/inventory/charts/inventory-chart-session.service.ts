import { Injectable } from '@angular/core';
import { InventoryChartSheetView } from '@app/v1/shared/charts/inventory-chart-sheet/inventory-chart-sheet.models';
import { MeterChartGrouping } from '@app/v1/data/meters/inventory/charts/meter-inventory-charts';

export interface InventoryChartSession {
  grouping: MeterChartGrouping;
  multiplePredictors: boolean;
  view: InventoryChartSheetView;
  zoom: { start: number; end: number };
}

@Injectable({ providedIn: 'root' })
export class InventoryChartSessionService {
  private readonly views = new Map<string, InventoryChartSession>();

  read(key: string): InventoryChartSession | undefined {
    const value = this.views.get(key);
    return value ? structuredClone(value) : undefined;
  }

  save(key: string, value: InventoryChartSession): void {
    this.views.set(key, structuredClone(value));
  }
}
