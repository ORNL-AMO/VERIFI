import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardImportFooterComponent } from './data-wizard-import-footer.component';

describe('DataWizardImportFooterComponent', () => {
  let component: DataWizardImportFooterComponent;
  let fixture: ComponentFixture<DataWizardImportFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardImportFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataWizardImportFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
