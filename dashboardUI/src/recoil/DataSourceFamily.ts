import { atomFamily } from "recoil";

export const dataSourceAtomFamily = atomFamily<string,string>({
    key: 'dataSourceAtomFamily',
    default: '',
  });
  