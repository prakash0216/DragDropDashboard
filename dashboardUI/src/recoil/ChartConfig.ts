import { atom } from "recoil";

export const chartConfigState=atom<{[id:string]:any}>({
    key:'chartConfigState',
    default:{}
})