import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalanderizationHelpComponent } from './calanderization-help.component';

describe('CalanderizationHelpComponent', () => {
  let component: CalanderizationHelpComponent;
  let fixture: ComponentFixture<CalanderizationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalanderizationHelpComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CalanderizationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
