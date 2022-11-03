import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsUtilitiesTableComponent } from './emissions-utilities-table.component';

describe('EmissionsUtilitiesTableComponent', () => {
  let component: EmissionsUtilitiesTableComponent;
  let fixture: ComponentFixture<EmissionsUtilitiesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsUtilitiesTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsUtilitiesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
