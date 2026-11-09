import {describe,expect,it} from "vitest";
import {coinLevel,isShopSlot,LESSON_COINS,STAGE_COINS} from "./coins";
describe("Монета көрсөткүчтөрү",()=>{
 it("бир сабактын чеги 55",()=>{expect(STAGE_COINS).toEqual([5,15,10,15,10]);expect(LESSON_COINS).toBe(55);});
 it("деңгээл баланстан эмес жалпы тапкан монетадан эсептелет",()=>{expect(coinLevel(0)).toEqual({level:1,progress:0,remaining:100});expect(coinLevel(100)).toEqual({level:2,progress:0,remaining:100});expect(coinLevel(255)).toEqual({level:3,progress:55,remaining:45});});
 it("профиль үчүн белгилүү орундар гана",()=>{expect(isShopSlot("grade")).toBe(false);for(const s of ["avatar","frame","title"])expect(isShopSlot(s)).toBe(true);});
});
