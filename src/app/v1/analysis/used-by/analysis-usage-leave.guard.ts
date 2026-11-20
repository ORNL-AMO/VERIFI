import { CanDeactivateFn } from '@angular/router';
import { AnalysisUsageService } from './analysis-usage.service';

/** Protect the action draft even when moving between children of the same workbench. */
export const analysisUsageLeaveGuard: CanDeactivateFn<{ readonly usage: AnalysisUsageService }> = component => component.usage.resolveLeave();
