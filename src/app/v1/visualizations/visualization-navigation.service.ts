import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { visualizationLibraryRoute, visualizationWorkbenchRoute } from '@app/v1/routing/workspace-route';

/** Allowlisted session return context, separate from saved visualization intent. */
@Injectable({ providedIn: 'root' })
export class VisualizationNavigationService {
  private readonly router = inject(Router);
  private readonly returns = new Map<string, string | undefined>();
  readonly libraryRoute = visualizationLibraryRoute;
  readonly workbenchRoute = visualizationWorkbenchRoute;

  rememberReturn(accountGuid: string, facilityGuid?: string): void {
    this.returns.set(accountGuid, facilityGuid);
  }

  open(accountGuid: string, guid: string): Promise<boolean> {
    return this.router.navigate(visualizationWorkbenchRoute(accountGuid, guid));
  }

  returnToLibrary(accountGuid: string): Promise<boolean> {
    const facility = this.returns.get(accountGuid);
    return this.router.navigate(visualizationLibraryRoute(accountGuid), { queryParams: facility ? { facility } : {} });
  }
}
