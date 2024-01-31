import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherEmissionsDataTableComponent } from './other-emissions-data-table.component';

describe('OtherEmissionsDataTableComponent', () => {
  let component: OtherEmissionsDataTableComponent;
  let fixture: ComponentFixture<OtherEmissionsDataTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OtherEmissionsDataTableComponent]
    });
    fixture = TestBed.createComponent(OtherEmissionsDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
