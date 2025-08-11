import { Layout } from "react-grid-layout";
import { atom } from "recoil";

export const layoutState = atom<{ [key: string]: Layout[] }>({
    key: 'layoutState',
    default: {
      lg: [],
      md: [],
      sm: [],
      xs: [],
      xxs: [],
    },
  });
  