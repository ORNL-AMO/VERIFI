import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardComponent } from './data-wizard.component';

describe('DataWizardComponent', () => {
  let component: DataWizardComponent;
  let fixture: ComponentFixture<DataWizardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataWizardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
