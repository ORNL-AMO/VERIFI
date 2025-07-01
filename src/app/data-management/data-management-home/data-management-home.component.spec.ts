import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementHomeComponent } from './data-management-home.component';

describe('DataManagementHomeComponent', () => {
  let component: DataManagementHomeComponent;
  let fixture: ComponentFixture<DataManagementHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementHomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataManagementHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
