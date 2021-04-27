import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CalanderizationComponent } from './calanderization.component';

describe('CalanderizationComponent', () => {
  let component: CalanderizationComponent;
  let fixture: ComponentFixture<CalanderizationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CalanderizationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalanderizationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
