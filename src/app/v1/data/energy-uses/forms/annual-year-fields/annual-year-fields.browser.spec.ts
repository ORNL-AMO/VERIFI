import { TestBed } from '@angular/core/testing';
import { page } from 'vitest/browser';
import { EnergyUsesModule } from '../../energy-uses.module';
import { energyUseItem } from '../../energy-uses.testing';
import { energyUseSetup } from '../../models/energy-use-setup.models';
import { AnnualDataFieldsComponent } from '../annual-data-fields/annual-data-fields.component';
import { EnergyUseSetupFormService } from '../energy-use-setup-form.service';

it('keeps the shared unit chevron visible before, during and after focus in each theme', async () => {
  TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
  const form = TestBed.inject(EnergyUseSetupFormService).build(energyUseSetup(energyUseItem()));
  form.controls.consumption.controls[0].controls.entries.controls[0].controls.energyUseUnit.setValue('MMBtu');
  const fixture = TestBed.createComponent(AnnualDataFieldsComponent);
  fixture.componentRef.setInput('form', form); fixture.componentRef.setInput('canEdit', true);
  const root = document.createElement('main'); root.append(fixture.nativeElement); document.body.append(root);
  // A shared select also protects the focus rule used by Meter/Predictor forms.
  const shared = document.createElement('select'); shared.className = 'v1-select'; shared.setAttribute('aria-label', 'Shared unit');
  shared.add(new Option('MMBtu', 'MMBtu')); root.append(shared);
  try {
    await page.viewport(600, 850);
    for (const [theme, name] of [['', 'light'], ['v1-theme-dark', 'dark'], ['v1-theme-dark v1-contrast-strong', 'contrast']] as const) {
      root.className = `v1-root ${theme}`; fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
      const units = root.querySelector<HTMLSelectElement>('[formcontrolname="energyUseUnit"]')!;
      for (const select of [units, shared]) {
        select.blur(); expect(getComputedStyle(select).backgroundImage).toContain('linear-gradient');
        select.focus(); expect(document.activeElement).toBe(select);
        expect(getComputedStyle(select).backgroundImage).toContain('linear-gradient');
        expect(getComputedStyle(select).backgroundRepeat).toContain('no-repeat');
        select.blur(); expect(getComputedStyle(select).backgroundImage).toContain('linear-gradient');
      }
      units.focus();
      await page.screenshot({ element: units.parentElement!, path: `../../../../../../../tmp/energy-use-results/unit-chevron-${name}.png` });
    }
  } finally { fixture.destroy(); root.remove(); }
});
