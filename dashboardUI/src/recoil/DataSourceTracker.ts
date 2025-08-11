import { atom } from 'recoil';

// Atom to track all data source names
export const dataSourceNamesState = atom<string[]>({
  key: 'dataSourceNamesState',
  default: ['ds1', 'ds2', 'ds3'], // Start with some default data sources
});

// Optional: Atom to track when data sources are updated (for triggering re-renders)
export const dataSourceUpdateTriggerState = atom<number>({
  key: 'dataSourceUpdateTriggerState', 
  default: 0,
});