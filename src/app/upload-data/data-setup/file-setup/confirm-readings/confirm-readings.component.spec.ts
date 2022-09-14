import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmReadingsComponent } from './confirm-readings.component';

describe('ConfirmReadingsComponent', () => {
  let component: ConfirmReadingsComponent;
  let fixture: ComponentFixture<ConfirmReadingsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmReadingsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfirmReadingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
