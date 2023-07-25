import { time } from "./definitions/time";
import { area } from "./definitions/area";
import { mass } from "./definitions/mass";
import { temperature } from "./definitions/temperature";
import { volume } from "./definitions/volume";
import { digital } from "./definitions/digital";
import { partsPer } from "./definitions/partsPer";
import { speed } from "./definitions/speed";
import { pressure } from "./definitions/pressure";
import { power } from "./definitions/power";
import { current } from "./definitions/current";
import { energy } from "./definitions/energy";
import { voltage } from "./definitions/voltage";
import { apparentPower } from "./definitions/apparentPower";
import { reactiveEnergy } from "./definitions/reactiveEnergy";
import { reactivePower } from "./definitions/reactivePower";
import { volumeFlowRate } from "./definitions/volumeFlowRate";
import { viscosity } from "./definitions/viscosity";
import { frequency } from "./definitions/frequency";
import { force } from "./definitions/force";
import { specificHeat } from "./definitions/specificHeat";
import { volumetricHeat } from "./definitions/volumetricHeat";
import { specificEnergy } from "./definitions/specificEnergy";
import { density } from "./definitions/density";
import { volumetricEnergy } from "./definitions/volumetricEnergy";
import { specificVolume } from "./definitions/specificVolume";
import { thermalConductivity } from "./definitions/thermalConductivity";
import { length } from './definitions/length';
import * as _ from 'lodash';

export class ConvertValue {
    _measures = {
        length: length,
        area: area,
        mass: mass,
        volume: volume,
        temperature: temperature,
        time: time,
        digital: digital,
        partsPer: partsPer,
        speed: speed,
        pressure: pressure,
        power: power,
        current: current,
        energy: energy,
        voltage: voltage,
        apparentPower: apparentPower,
        reactiveEnergy: reactiveEnergy,
        reactivePower: reactivePower,
        volumeFlowRate: volumeFlowRate,
        viscosity: viscosity,
        frequency: frequency,
        force: force,
        //kineViscosity: kineViscosity,
        specificHeat: specificHeat,
        volumetricHeat: volumetricHeat,
        specificEnergy: specificEnergy,
        density: density,
        volumetricEnergy: volumetricEnergy,
        specificVolume: specificVolume,
        thermalConductivity: thermalConductivity
    };

    origin: any;
    destination: any;
    convertedValue: number;
    hasError: boolean;
    constructor(value: number, from: string, to: string) {
        if (value != undefined) {
            this.origin = this.getUnit(from);
            this.destination = this.getUnit(to);

            if (!this.origin || !this.destination) {
                this.hasError = true;
                this.convertedValue = value;
            } else {
                this.hasError = false;
                this.convertedValue = this.convertValue(value);
            }
        }
    }

    convertValue(value: number) {
        // Don't change the value if origin and destination are the same
        if (this.origin.abbr === this.destination.abbr) {
            return value;
        }

        // You can't go from liquid to mass, for example
        if (this.destination.measure !== this.origin.measure) {
            this.hasError = true;
            return value;
        }

        /**
         * Convert from the source value to its anchor inside the system
         */
        let result: number = value * this.origin.unit.to_anchor;

        /**
         * For some changes it's a simple shift (C to K)
         * So we'll add it when converting into the unit (later)
         * and subtract it when converting from the unit
         */
        if (this.origin.unit.anchor_shift) {
            result -= this.origin.unit.anchor_shift;
        }

        /**
         * Convert from one system to another through the anchor ratio. Some conversions
         * aren't ratio based or require more than a simple shift. We can provide a custom
         * transform here to provide the direct result
         */
        if (this.origin.system !== this.destination.system) {
            let transform = this._measures[this.origin.measure]._anchors[this.origin.system].transform;
            if (typeof transform === 'function') {
                result = transform(result);
            }
            else {
                result *= this._measures[this.origin.measure]._anchors[this.origin.system].ratio;
            }
        }

        /**
         * This shift has to be done after the system conversion business
         */
        if (this.destination.unit.anchor_shift) {
            result += this.destination.unit.anchor_shift;
        }

        /**
         * Convert to another unit inside the destination system
         */
        this.hasError = false;
        return result / this.destination.unit.to_anchor;
    }


    getUnit(abbr: string) {
        var found;

        _.each(this._measures, function (systems, measure) {
            _.each(systems, function (units, system) {
                if (system === '_anchors')
                    return false;

                _.each(units, function (unit, testAbbr) {
                    if (testAbbr === abbr) {
                        found = {
                            abbr: abbr
                            , measure: measure
                            , system: system
                            , unit: unit
                        };
                        return false;
                    }
                });

                if (found)
                    return false;
            });

            if (found)
                return false;
        });
        // console.log(found);

        return found;
    }
}