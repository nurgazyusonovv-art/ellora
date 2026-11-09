export const GAME_TYPES={matching:"Дал келтирүү",ordering:"Кадамдарды иреттөө",classification:"Топторго бөлүү"} as const;
export type GameType=keyof typeof GAME_TYPES;
