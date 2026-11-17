import type { ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PreviewComponent } from '../preview/preview/preview.component';

/** Assert retained numerical/provenance evidence independently of chart-only presentation. */
export function previewValuesText<T>(fixture: ComponentFixture<T>): string {
  const preview = fixture.componentInstance instanceof PreviewComponent ? fixture.componentInstance
    : fixture.debugElement.query(By.directive(PreviewComponent))?.componentInstance as PreviewComponent | undefined;
  const state = preview?.preview.state();
  return state?.state === 'ready' ? [state.presentation.details.caption, ...state.presentation.details.rows.map(row => row.join(' '))].join('\n') : '';
}
