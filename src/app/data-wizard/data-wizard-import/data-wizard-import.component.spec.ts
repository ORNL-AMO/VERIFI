import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardImportComponent } from './data-wizard-import.component';

describe('DataWizardImportComponent', () => {
  let component: DataWizardImportComponent;
  let fixture: ComponentFixture<DataWizardImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardImportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataWizardImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
