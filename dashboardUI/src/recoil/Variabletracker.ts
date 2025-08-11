// Create this file: recoil/VariableTracker.ts
import { atom } from 'recoil';

// Atom to track all variable names that have been created
export const variableNamesState = atom<Set<string>>({
  key: 'variableNamesState',
  default: new Set<string>(),
});

// Atom to track variable updates for reactivity
export const variableUpdateTriggerState = atom<number>({
  key: 'variableUpdateTriggerState',
  default: 0,
});