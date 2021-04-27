import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CalanderizationFilterComponent } from './calanderization-filter.component';

describe('CalanderizationFilterComponent', () => {
  let component: CalanderizationFilterComponent;
  let fixture: ComponentFixture<CalanderizationFilterComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CalanderizationFilterComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CalanderizationFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
