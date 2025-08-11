import { atomFamily } from "recoil";

export const variableAtomFamily = atomFamily<string,string>({
    key: 'variableAtomFamily',
    default: '',
  });
  