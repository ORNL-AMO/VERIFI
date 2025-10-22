import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementTabs } from './data-management-tabs';

describe('DataManagementTabs', () => {
  let component: DataManagementTabs;
  let fixture: ComponentFixture<DataManagementTabs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementTabs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataManagementTabs);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
