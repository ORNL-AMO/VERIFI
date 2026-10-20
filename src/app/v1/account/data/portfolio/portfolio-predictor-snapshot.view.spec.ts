import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { buildPredictorCards, buildWeatherStationGroups } from '@app/v1/facility/data/predictors/models';
import { buildPredictorInventory } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.models';
import { inventoryNavigation, inventoryPredictor, inventoryReading, inventoryWorkspace } from '@app/v1/facility/data/predictors/predictor-inventory/predictor-inventory.testing';
import { makeFinding, StatusEvaluationState, StatusItem } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';
import { buildPredictorSnapshots } from './portfolio-predictor-snapshot.view';

const navigation = { ...inventoryNavigation, facilityMeterRoute: () => ['/unused'] };
const row = (month: number, amount=10, options: Partial<IdbPredictorData>={}) => inventoryReading('p1',{guid:`r${month}`,year:2026,month,amount,...options});
const entity = {kind:'predictor' as const,guid:'p1',name:'Production',accountGuid:'account',facilityGuid:'facility'};
const finding = (code: Parameters<typeof makeFinding>[0], severity: 'error' | 'warning'='error') => presentFindings([makeFinding(code,severity,'quality',entity,{count:1})])[0];
function snapshot(data: readonly IdbPredictorData[], findings: readonly StatusItem[]=[], options: Partial<IdbPredictor>={}, state: StatusEvaluationState='ready') {
  const predictor=inventoryPredictor('p1',options),facility=inventoryWorkspace(1).facility()!;
  const entries=buildPredictorInventory(buildPredictorCards([predictor],data,findings,state==='ready'),buildWeatherStationGroups([predictor],data,findings,state==='ready'),facility,state);
  return buildPredictorSnapshots(entries,data,state,navigation).get('p1')!;
}

describe('account predictor reading snapshots',()=>{
  it('shows actual monthly records, stable duplicate ordering, values and exact units without summing',()=>{
    const view=snapshot([row(1),row(6,0,{guid:'z'}),row(6,-2,{guid:'a'}),row(5,3)]);
    expect(view.readingCount).toBe(4);expect(view.rangeLabel).toBe('Jan 2026 – Jun 2026');
    expect(view.recentReadings.map(item=>item.guid)).toEqual(['a','z','r5']);
    expect(view.recentReadings.map(item=>item.valueLabel)).toEqual(['-2 tons','0 tons','3 tons']);
    expect(view.recentReadings[0]).toMatchObject({dateLabel:'Jun 2026',dateKey:'2026-06',tone:'neutral',icon:undefined});
    expect(view.readingsLink.route).toEqual(navigation.facilityPredictorRoute('facility','p1','readings'));
    expect(view.facts).toEqual([]);
  });
  it('flags individual duplicate and negative records only when the existing finding is active',()=>{
    const view=snapshot([row(6,-2,{guid:'a'}),row(6,0,{guid:'b'}),row(5,4)], [finding('predictor.data.duplicate-month'),finding('predictor.data.negative')]);
    expect(view.recentReadings.map(item=>item.tone)).toEqual(['danger','danger','neutral']);
    expect(view.recentReadings[0].description).toContain('Review negative predictor data');
    expect(view.recentReadings[1].description).not.toContain('Review negative predictor data');
    expect(snapshot([row(6,-2)],[finding('predictor.data.negative')],{canBeNegative:true}).recentReadings[0].tone).toBe('neutral');
  });
  it('uses the existing quality report for exact outlier records and keeps older/gap findings visible',()=>{
    const data=[10,11,9,12,8,11,1000].map((amount,index)=>row(index+1,amount));
    const view=snapshot(data,[finding('predictor.quality.outlier','warning'),finding('predictor.data.gap'),finding('predictor.currency.stale','warning')]);
    expect(view.recentReadings.map(item=>item.tone)).toEqual(['warning','neutral','neutral']);
    expect(view.findings).toHaveLength(2);expect(view.remainingFindings).toBe(1);
    expect(view.findings[0].title).toBe('Fill missing predictor data');
    expect(snapshot(data).recentReadings[0].tone).toBe('neutral');
    const older=snapshot([row(1,-10),row(2),row(3),row(4)],[finding('predictor.data.negative')]);
    expect(older.recentReadings.every(item=>item.tone==='neutral')).toBe(true);expect(older.findings).toHaveLength(1);
  });
  it('preserves weather units, individual weather flags and canonical station/quality destinations',()=>{
    const weather:Partial<IdbPredictor>={predictorType:'Weather',weatherStationId:'KORD',weatherStationName:'Chicago',weatherDataType:'HDD',heatingBaseTemperature:65,unit:'days'};
    const data=[row(5,0),row(6,100,{weatherDataChanged:true}),row(4,20,{weatherDataWarning:true})];
    const view=snapshot(data,[finding('predictor.weather.warning','warning'),finding('predictor.quality.outlier','warning')],weather);
    expect(view.recentReadings.map(item=>item.valueLabel)).toEqual(['100 days','0 days','20 days']);
    expect(view.recentReadings.map(item=>item.tone)).toEqual(['warning','neutral','warning']);
    expect(view.readingsLink.route).toEqual(navigation.facilityWeatherPredictorRoute('facility','station:KORD','readings'));
    expect(view.findings.find(item=>item.title==='Review predictor outliers')?.action?.route).toEqual(navigation.facilityWeatherPredictorQualityRoute('facility','station:KORD','p1'));
    expect(view.findings.find(item=>item.title==='Review weather data')?.action?.route).toEqual(view.readingsLink.route);
    expect(view.facts).toEqual([]);
    expect(snapshot(data,[finding('predictor.weather.warning','warning')],{...weather,ignoreWeatherDataWarning:true}).recentReadings.every(item=>item.tone==='neutral')).toBe(true);
  });
  it.each(['idle','evaluating','error'] as const)('keeps %s checks neutral and hides stale findings',state=>{
    const view=snapshot([row(1,-3)],[finding('predictor.data.negative')],{},state);
    expect(view.findings).toEqual([]);expect(view.recentReadings[0]).toMatchObject({tone:'neutral',statusLabel:state==='error'?'Checks unavailable':'Checks pending'});
  });
  it('isolates account/facility ownership and explains missing dates, amounts and units without fabricating values',()=>{
    const view=snapshot([row(0),row(13),row(1,NaN),row(2,0),row(3,4,{accountId:'other'}),row(4,5,{facilityId:'other'})],[],{unit:'',description:'Saved context'});
    expect(view.readingCount).toBe(4);expect(view.invalidDateCount).toBe(2);expect(view.rangeLabel).toBe('Jan 2026 – Feb 2026');
    expect(view.recentReadings.map(item=>item.valueLabel)).toEqual(['0','No value']);
    expect(view.facts).toEqual([{label:'Description',value:'Saved context'}]);
    expect(snapshot([]).rangeLabel).toBe('No readings yet');expect(snapshot([row(13)]).rangeLabel).toBe('Reading dates unavailable');
  });
  it.each([
    ['HDD','days'],['CDD','days'],['relativeHumidity','%'],['dryBulbTemp','°F'],
    ['wetBulbTemp','°F'],['dewPointTemp','°F'],['precipitation','in']
  ] as const)('uses the implied %s weather unit when no unit is saved', (weatherDataType,unit)=>{
    const view=snapshot([row(1,0)],[],{predictorType:'Weather',weatherDataType,unit:' '});
    expect(view.recentReadings[0].valueLabel).toBe(`0 ${unit}`);
    expect(view.facts).toEqual([]);
  });
});
