import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { ImportSessionService } from './import-session.service';

/** Keep a committed file's recovery receipt reachable until publication succeeds. */
export const importSessionGuard: CanActivateChildFn = (_route, state) => {
  const session = inject(ImportSessionService);
  if (session.pending()) return false;
  const recovery = session.recoveryDraft();
  if (recovery?.kind !== 'energy-uses-template') return true;
  const accountGuid = recovery.energyUses.preview.accountGuid;
  const requested = parseWorkspaceRoute(state.url);
  if (requested.accountGuid === accountGuid && requested.importFileId === recovery.id && requested.importStep === 'review') return true;
  return inject(Router).createUrlTree(['/v1/workspace/account', accountGuid, 'imports', 'file', recovery.id, 'review']);
};
