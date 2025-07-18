import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementImportFooterComponent } from './data-management-import-footer.component';

describe('DataManagementImportFooterComponent', () => {
  let component: DataManagementImportFooterComponent;
  let fixture: ComponentFixture<DataManagementImportFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementImportFooterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataManagementImportFooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
