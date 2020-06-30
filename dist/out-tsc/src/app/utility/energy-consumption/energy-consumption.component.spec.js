import { async, TestBed } from '@angular/core/testing';
import { EnergyConsumptionComponent } from './energy-consumption.component';
describe('EnergyConsumptionComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EnergyConsumptionComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(EnergyConsumptionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=energy-consumption.component.spec.js.map