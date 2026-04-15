import {
  extractLocationIdsRequiringLookup,
  getLocationLevelMappings,
  isNonEmptyString,
} from './integration-location.helper';
import type { SignalFieldMeta } from './signal-field-meta.helper';

describe('integration-location.helper', () => {
  it('isNonEmptyString', () => {
    expect(isNonEmptyString(' a ')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });

  it('getLocationLevelMappings vazio sem config', () => {
    const meta: SignalFieldMeta = {
      label: 'L',
      options: new Map(),
      type: 'location',
    };
    expect(getLocationLevelMappings(meta)).toEqual([]);
  });

  it('extractLocationIdsRequiringLookup sem entradas location', () => {
    const metaMap: Record<string, SignalFieldMeta> = {
      f: { label: 'x', options: new Map(), type: 'text' },
    };
    expect(
      extractLocationIdsRequiringLookup(
        [{ field: 'f', value: 1 }],
        metaMap,
      ),
    ).toEqual([]);
  });
});
