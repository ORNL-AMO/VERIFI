import { Component, computed, inject } from '@angular/core';
import { ImportSessionService } from '@app/v1/account/imports/import-session.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { buildImportNavigationFiles } from '../models';
@Component({
  selector: 'app-imports-nav',
  templateUrl: './imports-nav.component.html',
  styleUrls: ['./imports-nav.component.css'],
  standalone: false
})
export class ImportsNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly importSession = inject(ImportSessionService);
  readonly importFiles = computed(() => buildImportNavigationFiles(
    this.importSession.drafts(), this.navigation.activeImportFileId(), this.navigation.activeImportStep(), this.importSession.pending()
  ));
}
