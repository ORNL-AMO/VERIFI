import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementImportComponent } from './data-management-import.component';

describe('DataManagementImportComponent', () => {
  let component: DataManagementImportComponent;
  let fixture: ComponentFixture<DataManagementImportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementImportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataManagementImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
