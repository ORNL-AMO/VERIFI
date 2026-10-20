import { facility, group, meter, reading } from '@app/v1/facility/data/meters/facility-meters.testing';
import { inventoryNavigation } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.testing';
import { makeFinding, StatusEvaluationState, StatusFinding } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { buildPortfolioMeters } from './portfolio-meter.view';
import { buildMeterSnapshots } from './portfolio-meter-snapshot.view';

const entity = { kind:'meter' as const, guid:'m', name:'Electric', accountGuid:'account-a', facilityGuid:'f' };
const nav = { ...inventoryNavigation, facilityMeterRoute:(facility:string,guid:string,tab:string)=>['/facility',facility,'meters',guid,tab] };
const row = (month:number, changes:Partial<IdbUtilityMeterData>={}) => reading({ guid:`r${month}`,meterId:'m',facilityId:'f',year:2026,month,...changes });
function snapshot(readings:readonly IdbUtilityMeterData[], findings:readonly StatusFinding[]=[], state:StatusEvaluationState='ready', setup:Partial<IdbUtilityMeter>={}) {
  const views = buildPortfolioMeters({ facilities:[facility({guid:'f'})], meters:[meter({guid:'m',facilityId:'f',groupId:'g',...setup})],
    readings,groups:[group({guid:'g',facilityId:'f',name:'Production'})],findings:presentFindings(findings),statusState:state });
  return buildMeterSnapshots(views,readings,nav).get('m')!;
}
describe('meter reading snapshots',()=>{
  it('counts all saved records including duplicates and zeros, with the newest three records shown separately',()=>{
    const data=[row(8,{totalEnergyUse:0,totalCost:0}),row(1,{year:2024}),row(8,{guid:'duplicate',totalEnergyUse:0}),row(12,{year:2025})];
    const original=structuredClone(data), result=snapshot(data);
    expect(result.readingCount).toBe(4);expect(result.rangeLabel).toBe('Jan 2024 – Aug 2026');
    expect(result.recentReadings.map(reading=>reading.guid)).toEqual(['duplicate','r8','r12']);
    expect(result.recentReadings[0]).toMatchObject({dateLabel:'Aug 1, 2026',dateKey:'2026-08-01',tone:'neutral',valueLabel:'0 kWh'});
    expect(data).toEqual(original);
  });
  it('flags exact records rather than every reading in the month, with errors taking priority over outliers',()=>{
    const data=[1,2,3,4,5].map(month=>row(month));
    data.push(row(5,{guid:'negative',day:15,totalEnergyUse:-30}),row(6,{totalEnergyUse:100}));
    const result=snapshot(data,[makeFinding('meter.data.negative','error','quality',entity,{count:1}),
      makeFinding('meter.quality.consumption-outlier','warning','quality',entity,{count:2})]);
    expect(result.recentReadings.map(reading=>[reading.guid,reading.tone])).toEqual([['r6','warning'],['negative','danger'],['r5','neutral']]);
    expect(result.recentReadings[1].description).toContain('Review negative readings');
    expect(result.recentReadings[0].statusLabel).toBe('Has warnings');
    expect(result.recentReadings[1].statusLabel).toBe('Has errors');
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].action?.route).toEqual(['/facility','f','meters','m','readings']);
    expect(result.remainingFindings).toBe(0);
  });
  it('uses full dates and GUID tie-breakers for order and keeps duplicate-date flags off other dates in the same month',()=>{
    const data=[row(6,{guid:'b'}),row(6,{guid:'a'}),row(6,{guid:'latest',day:15}),row(5)];
    const result=snapshot(data,[makeFinding('meter.data.duplicate-date','error','quality',entity,{dates:['2026-06-01']})]);
    expect(result.recentReadings.map(reading=>[reading.guid,reading.tone])).toEqual([['latest','neutral'],['a','danger'],['b','danger']]);
    expect(result.recentReadings[1].description).toContain('Resolve duplicate readings');
    expect(result.readingCount).toBe(4);
  });
  it('uses the Quality report row flags for consumption and cost warnings without treating zero cost as absent',()=>{
    const data=[1,2,3,4,5,6].map(month=>row(month,{totalEnergyUse:month===4?100:10,totalCost:month===5?100:0}));
    const consumption=makeFinding('meter.quality.consumption-outlier','warning','quality',entity,{count:1});
    const cost=makeFinding('meter.quality.cost-outlier','warning','quality',entity,{count:1});
    const result=snapshot(data,[consumption,cost]);
    expect(result.recentReadings.filter(reading=>reading.tone==='warning').map(reading=>reading.dateLabel)).toEqual(['May 1, 2026','Apr 1, 2026']);
    expect(result.recentReadings.find(reading=>reading.guid==='r4')!.description).toContain('Review consumption outliers');
    expect(result.recentReadings.find(reading=>reading.guid==='r5')!.description).toContain('Review cost outliers');
    expect(result.findings.every(finding=>finding.action?.route.at(-1)==='quality')).toBe(true);
    // Disabled or dismissed cost warning is absent from active findings.
    expect(snapshot(data,[consumption]).recentReadings.find(reading=>reading.guid==='r5')!.tone).toBe('neutral');
    expect(snapshot(data).recentReadings.every(reading=>reading.tone==='neutral')).toBe(true);
  });
  it('keeps gaps, old data and setup issues at card level without inventing reading rows',()=>{
    const data=[row(1),row(3)];
    const gap=makeFinding('meter.data.gap','error','completeness',entity,{periods:['2026-02'],periodType:'month',count:1});
    const missing=snapshot(data,[gap], 'ready',{meterReadingDataApplication:'fullMonth'});
    expect(missing.recentReadings.map(reading=>reading.dateLabel)).toEqual(['Mar 1, 2026','Jan 1, 2026']);
    expect(missing.recentReadings.every(reading=>reading.statusLabel===undefined)).toBe(true);
    expect(missing.findings[0].title).toBe('Fill missing meter data');
    const result=snapshot(data,[makeFinding('meter.currency.stale','warning','currency',entity),makeFinding('meter.configuration.invalid','error','configuration',entity)]);
    expect(result.recentReadings.every(reading=>reading.tone==='neutral')).toBe(true);expect(result.findings).toHaveLength(2);
    expect(result.findings.find(finding=>finding.title==='Complete meter setup')?.action?.route.at(-1)).toBe('settings');
  });
  it('respects allowed negative values and retains annual reading records without fabricating monthly coverage',()=>{
    expect(snapshot([row(1,{totalEnergyUse:-5})],[], 'ready',{canBeNegative:true}).recentReadings[0].statusLabel).toBeUndefined();
    const result=snapshot([row(1,{year:2024}),row(1)], [makeFinding('meter.data.gap','error','completeness',entity,{periods:['2025'],periodType:'year',count:1})], 'ready',{meterReadingDataApplication:'fullYear'});
    expect(result.recentReadings).toHaveLength(2);
    expect(result.recentReadings.every(reading=>reading.statusLabel===undefined)).toBe(true);
    expect(result.findings[0].title).toBe('Fill missing meter data');
  });
  it.each(['idle','evaluating','error'] as const)('does not show stale reading findings or actions while checks are %s',state=>{
    const result=snapshot([row(1,{totalEnergyUse:-5})],[makeFinding('meter.data.negative','error','quality',entity,{count:1})],state);
    expect(result.recentReadings.every(reading=>reading.tone==='neutral')).toBe(true);expect(result.findings).toEqual([]);
    expect(result.recentReadings[0].statusLabel).toBe(state==='error'?'Checks unavailable':'Checks pending');
  });
  it('shows explicit missing setup and empty/invalid-date states without rolling invalid months into another year',()=>{
    const empty=snapshot([],[], 'ready',{startingUnit:undefined,groupId:undefined});
    expect(empty).toMatchObject({readingCount:0,rangeLabel:'No readings yet',recentReadings:[]});
    expect(empty.facts).toEqual([]);
    expect(empty.group).toEqual({label:'Meter group',value:'Not assigned',icon:'meterGroupItem',route:undefined});
    const invalid=snapshot([row(13),row(0),row(1,{year:NaN})]);
    expect(invalid).toMatchObject({readingCount:3,rangeLabel:'Reading dates unavailable',invalidDateCount:3,recentReadings:[]});
    expect(snapshot([row(2,{day:31}),row(2,{day:0})])).toMatchObject({invalidDateCount:2,recentReadings:[]});
    expect(snapshot([row(1)]).rangeLabel).toBe('Jan 2026');
  });
  it('keeps ownership isolated and only adds fuel where relevant',()=>{
    const data=[row(1),row(2,{accountId:'other'}),row(3,{facilityId:'other'}),row(4,{meterId:'other'})];
    expect(snapshot(data).readingCount).toBe(1);
    expect(snapshot(data).group).toMatchObject({icon:'meterGroupItem',route:nav.facilityMeterGroupRoute('f','g','monthly-table')});
    expect(snapshot([row(1)],[], 'ready',{source:'Other Fuels',fuel:'Diesel',scope:1}).facts).toContainEqual({label:'Fuel',value:'Diesel'});
    expect(snapshot([row(1)],[], 'ready',{source:'Electricity',fuel:'Diesel'}).facts).not.toContainEqual({label:'Fuel',value:'Diesel'});
  });
  it('keeps older issues visible even when all three recent records are unflagged',()=>{
    const result=snapshot([row(1,{totalEnergyUse:-5}),row(2),row(3),row(4)],[makeFinding('meter.data.negative','error','quality',entity,{count:1})]);
    expect(result.recentReadings.map(reading=>reading.guid)).toEqual(['r4','r3','r2']);
    expect(result.recentReadings.every(reading=>reading.statusLabel===undefined)).toBe(true);
    expect(result.findings[0].title).toBe('Review negative readings');
  });
  it.each([
    [{source:'Electricity',energyUnit:'kWh'}, {totalEnergyUse:12.5,totalVolume:999}, 'Energy use','12.5 kWh'],
    [{source:'Natural Gas',energyUnit:'therm'}, {totalEnergyUse:25,totalVolume:999}, 'Energy use','25 therm'],
    [{source:'Other Energy',energyUnit:'MMBtu'}, {totalEnergyUse:1.2}, 'Energy use','1.2 MMBtu'],
    [{source:'Other Fuels',scope:1,energyUnit:'MMBtu'}, {totalEnergyUse:0,totalVolume:55}, 'Energy use','0 MMBtu'],
    [{source:'Other Fuels',scope:2,energyUnit:'GJ'}, {totalEnergyUse:2,totalVolume:300}, 'Energy use','2 GJ'],
    [{source:'Water Intake',startingUnit:'gal'}, {totalVolume:0,totalEnergyUse:999}, 'Consumption','0 gal'],
    [{source:'Water Discharge',startingUnit:'kgal'}, {totalVolume:42,totalEnergyUse:999}, 'Consumption','42 kgal'],
    [{source:'Other',startingUnit:'kg'}, {totalVolume:20,totalEnergyUse:999}, 'Consumption','20 kg'],
    [{source:'Other',startingUnit:'MJ',energyUnit:'MJ'}, {totalEnergyUse:5,totalVolume:999}, 'Energy use','5 MJ'],
    [{source:'Other Energy',scope:6,startingUnit:'kg'}, {totalVolume:9,totalEnergyUse:999}, 'Consumption','9 kg'],
    [{source:'Electricity',agreementType:4}, {RECs:3,totalEnergyUse:999}, 'RECs','3 MWh'],
    [{source:'Electricity',canBeNegative:true}, {totalEnergyUse:-5}, 'Energy use','-5 kWh']
  ] as const)('shows context-specific saved values and matching units for %j', (setup, values, quantityLabel, valueLabel)=>{
    const recent=snapshot([row(1,values)],[], 'ready',setup).recentReadings[0];
    expect(recent).toMatchObject({quantityLabel,valueLabel});expect(recent.description).toContain(`${quantityLabel}: ${valueLabel}`);
  });
  it.each([undefined,null,NaN,Infinity])('does not turn missing/nonfinite energy %s into zero', value=>{
    expect(snapshot([row(1,{totalEnergyUse:value})]).recentReadings[0].valueLabel).toBe('No value');
  });
  it('makes missing units explicit without applying display conversions to saved readings',()=>{
    const result=snapshot([row(1,{totalEnergyUse:10})],[], 'ready',{energyUnit:undefined,displayEnergyUnit:'GJ',displayEnergyIsSource:true});
    expect(result.recentReadings[0].valueLabel).toBe('10 (unit not set)');
  });
});
