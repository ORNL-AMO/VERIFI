import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FacilitiesTableComponent } from './facilities-table.component';

describe('FacilitiesTableComponent', () => {
  let component: FacilitiesTableComponent;
  let fixture: ComponentFixture<FacilitiesTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FacilitiesTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FacilitiesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
