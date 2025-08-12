import { atomFamily,atom } from "recoil";

export const dataSourceAtomFamily = atomFamily<string,string>({
    key: 'dataSourceAtomFamily',
    default: '',
  });
  

  export const dataSourceNamesState = atom<string[]>({
    key: 'dataSourceNamesState',
    default: [], // initially no data sources
  });