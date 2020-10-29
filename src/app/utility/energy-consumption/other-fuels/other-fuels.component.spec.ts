import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherFuelsComponent } from './other-fuels.component';

describe('OtherFuelsComponent', () => {
  let component: OtherFuelsComponent;
  let fixture: ComponentFixture<OtherFuelsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ OtherFuelsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(OtherFuelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
