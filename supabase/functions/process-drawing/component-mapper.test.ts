import { describe, it, expect } from 'vitest';
import { mapBomToComponentType, isTrackedItem } from './component-mapper';

describe('mapBomToComponentType', () => {
  // Valves
  it('maps "gate valve" to valve', () => expect(mapBomToComponentType('gate valve')).toBe('valve'));
  it('maps "ball valve" to valve', () => expect(mapBomToComponentType('ball valve')).toBe('valve'));
  it('maps "check valve" to valve', () => expect(mapBomToComponentType('check valve')).toBe('valve'));
  it('maps "butterfly valve" to valve', () => expect(mapBomToComponentType('butterfly valve')).toBe('valve'));
  
  // Flanges
  it('maps "flange RFWN" to flange', () => expect(mapBomToComponentType('flange RFWN')).toBe('flange'));
  it('maps "blind flange" to flange', () => expect(mapBomToComponentType('blind flange')).toBe('flange'));
  
  // Supports
  it('maps "pipe shoe" to support', () => expect(mapBomToComponentType('pipe shoe')).toBe('support'));
  it('maps "spring hanger" to support', () => expect(mapBomToComponentType('spring hanger')).toBe('support'));
  it('maps "guide" to support', () => expect(mapBomToComponentType('guide')).toBe('support'));
  
  // Fittings
  it('maps "elbow 90 LR" to fitting', () => expect(mapBomToComponentType('elbow 90 LR')).toBe('fitting'));
  it('maps "tee" to fitting', () => expect(mapBomToComponentType('tee')).toBe('fitting'));
  it('maps "reducer" to fitting', () => expect(mapBomToComponentType('reducer')).toBe('fitting'));
  it('maps "coupling" to fitting', () => expect(mapBomToComponentType('coupling')).toBe('fitting'));
  
  // Pipe
  it('maps "pipe" to pipe', () => expect(mapBomToComponentType('pipe')).toBe('pipe'));
  it('maps "threaded pipe" to threaded_pipe', () => expect(mapBomToComponentType('threaded pipe')).toBe('threaded_pipe'));
  
  // Instruments
  it('maps "instrument" to instrument', () => expect(mapBomToComponentType('instrument')).toBe('instrument'));
  it('maps "gauge" to instrument', () => expect(mapBomToComponentType('gauge')).toBe('instrument'));
  
  // Others
  it('maps "tubing" to tubing', () => expect(mapBomToComponentType('tubing')).toBe('tubing'));
  it('maps "hose" to hose', () => expect(mapBomToComponentType('hose')).toBe('hose'));
  it('maps unknown to misc_component', () => expect(mapBomToComponentType('unknown widget')).toBe('misc_component'));
});

describe('isTrackedItem', () => {
  it('returns false for shop items', () => expect(isTrackedItem('elbow 90 LR', 'shop')).toBe(false));
  it('returns false for bolts', () => expect(isTrackedItem('stud bolt', 'field')).toBe(false));
  it('returns false for gaskets', () => expect(isTrackedItem('spiral wound gasket', 'field')).toBe(false));
  it('returns false for nuts', () => expect(isTrackedItem('hex nut', 'field')).toBe(false));
  it('returns false for washers', () => expect(isTrackedItem('flat washer', 'field')).toBe(false));
  it('returns true for field valve', () => expect(isTrackedItem('gate valve', 'field')).toBe(true));
  it('returns true for field flange', () => expect(isTrackedItem('flange RFWN', 'field')).toBe(true));
  it('returns true for field pipe', () => expect(isTrackedItem('pipe', 'field')).toBe(true));
});

describe('isTrackedItem — description fallback', () => {
  it('returns false when description contains GASKET even if classification is wrong', () => {
    expect(isTrackedItem('fitting', 'field', '2" SWG GASKET 150# RF')).toBe(false);
  });

  it('returns false when description contains BOLT even if classification is wrong', () => {
    expect(isTrackedItem('support', 'field', 'STUD BOLT 5/8 x 3-1/2')).toBe(false);
  });

  it('returns false when description contains NUT', () => {
    expect(isTrackedItem('fitting', 'field', 'HEAVY HEX NUT 5/8')).toBe(false);
  });

  it('returns false when description contains WASHER', () => {
    expect(isTrackedItem('fitting', 'field', 'FLAT WASHER 5/8')).toBe(false);
  });

  it('returns true for valve even with description check', () => {
    expect(isTrackedItem('gate valve', 'field', '2" GATE VALVE 150# RF')).toBe(true);
  });

  it('still returns true for u-bolt (tracked support)', () => {
    expect(isTrackedItem('u-bolt', 'field', 'U-BOLT 4" PIPE')).toBe(true);
  });

  it('works with null description (backward compat)', () => {
    expect(isTrackedItem('gate valve', 'field')).toBe(true);
    expect(isTrackedItem('gasket', 'field')).toBe(false);
  });
});
