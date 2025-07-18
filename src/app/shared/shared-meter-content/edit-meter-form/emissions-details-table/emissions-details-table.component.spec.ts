import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsDetailsTableComponent } from './emissions-details-table.component';

describe('EmissionsDetailsTableComponent', () => {
  let component: EmissionsDetailsTableComponent;
  let fixture: ComponentFixture<EmissionsDetailsTableComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmissionsDetailsTableComponent]
    });
    fixture = TestBed.createComponent(EmissionsDetailsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
