import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DegreeDaysComponent } from './degree-days.component';

describe('DegreeDaysComponent', () => {
  let component: DegreeDaysComponent;
  let fixture: ComponentFixture<DegreeDaysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DegreeDaysComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DegreeDaysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
