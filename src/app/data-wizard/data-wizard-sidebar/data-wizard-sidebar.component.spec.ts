import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataWizardSidebarComponent } from './data-wizard-sidebar.component';

describe('DataWizardSidebarComponent', () => {
  let component: DataWizardSidebarComponent;
  let fixture: ComponentFixture<DataWizardSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataWizardSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataWizardSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
