import {afterEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
import sharp from "sharp";
import {illustrateSlides} from "./slide-illustrations";
import {validSlideImage} from "./presentation";
const slide={title:"Маалымат",body:"Киргизүү жана натыйжа",icon:"computer" as const,diagram:["Киргизүү","Натыйжа"],question:"Эмне өзгөрөт?"};
afterEach(()=>vi.unstubAllGlobals());
describe("ЖИ слайд иллюстрациялары",()=>{
 it("чыныгы растрды кичирейтип слайдга жайгаштырат жана сырды промптко кошпойт",async()=>{
  const bytes=await sharp({create:{width:16,height:16,channels:3,background:"white"}}).webp().toBuffer();
  const fetcher=vi.fn(async()=>({ok:true,text:async()=>JSON.stringify({data:[{b64_json:bytes.toString("base64")} ]})}));vi.stubGlobal("fetch",fetcher);
  const r=await illustrateSlides([slide],"Таблица",7,"private-key");expect(r.created).toBe(1);expect(validSlideImage(r.slides[0].image)).toBe(true);expect(r.slides[0].image?.alt).toBe("Маалымат");
  const options=fetcher.mock.calls[0] as unknown as [string,{body:string}];expect(options[1].body).not.toContain("private-key");expect(JSON.parse(options[1].body).n).toBe(1);
 });
 it("кызматтын жана бузук сүрөттүн катасында схеманы сактайт",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce({ok:true,text:async()=>JSON.stringify({data:[{b64_json:"bad"}]})}));
  const r=await illustrateSlides([slide,slide],"Тема",7,"key");expect(r.created).toBe(0);expect(r.missing).toBe(2);expect(r.slides[0].diagram).toEqual(slide.diagram);expect(r.slides[0].image).toBeUndefined();
 });
 it("бир учурда экиден ашык сүрөт чакырбайт",async()=>{
  let active=0,max=0;vi.stubGlobal("fetch",vi.fn(async()=>{active++;max=Math.max(max,active);await Promise.resolve();active--;return {ok:false};}));
  const r=await illustrateSlides(Array.from({length:6},()=>slide),"Тема",7,"key");expect(max).toBe(2);expect(r.missing).toBe(6);
 });
});
