import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({role:"student",rpc:vi.fn(),refresh:vi.fn()}));
vi.mock("next/cache",()=>({revalidatePath:(path:string)=>state.refresh(path)}));
vi.mock("@/lib/auth",()=>({requireRole:async(role:string)=>{if(state.role!==role)throw Error("forbidden");return {profile:{id:"me"},supabase:{rpc:state.rpc}};}}));
import {buyItem,equipItem} from "./shop";
const fd=(values:Record<string,string>)=>{const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;};
beforeEach(()=>{state.role="student";state.rpc.mockReset().mockResolvedValue({data:"ok",error:null});state.refresh.mockClear();});
describe("Дүкөн аракеттери",()=>{
 it("мугалим сатып ала албайт",async()=>{state.role="teacher";await expect(buyItem({},fd({itemId:"avatar-fox"}))).rejects.toThrow("forbidden");expect(state.rpc).not.toHaveBeenCalled();});
 it("кардар берген баа, баланс жана башка окуучу id эске алынбайт",async()=>{expect((await buyItem({},fd({itemId:"avatar-fox",price:"0",balance:"99999",studentId:"other"}))).success).toBeTruthy();expect(state.rpc).toHaveBeenCalledWith("buy_shop_item",{p_item:"avatar-fox"});expect(state.refresh).toHaveBeenCalledWith("/student");});
 it("кайра сатып алуу же жетпеген баланс түшүнүктүү ката берет",async()=>{state.rpc.mockResolvedValue({data:"already_owned",error:null});expect((await buyItem({},fd({itemId:"avatar-fox"}))).error).toMatch(/сенде бар/);state.rpc.mockResolvedValue({data:"not_enough",error:null});expect((await buyItem({},fd({itemId:"avatar-fox"}))).error).toMatch(/жетишсиз/);expect(state.refresh).not.toHaveBeenCalled();});
 it("буюмдун жараксыз ордун же id'син кабыл албайт",async()=>{expect((await equipItem({},fd({slot:"grade",itemId:"avatar-fox"}))).error).toBeTruthy();expect((await buyItem({},fd({itemId:"../fake"}))).error).toBeTruthy();expect(state.rpc).not.toHaveBeenCalled();});
 it("буюмду тандоо жана кадимки көрүнүшкө кайтуу",async()=>{await equipItem({},fd({slot:"avatar",itemId:"avatar-fox"}));expect(state.rpc).toHaveBeenCalledWith("equip_shop_item",{p_slot:"avatar",p_item:"avatar-fox"});await equipItem({},fd({slot:"avatar"}));expect(state.rpc).toHaveBeenLastCalledWith("equip_shop_item",{p_slot:"avatar",p_item:null});});
 it("ички база катасы кардарга чыгарылбайт",async()=>{state.rpc.mockResolvedValue({data:null,error:{message:"private database detail"}});const r=await buyItem({},fd({itemId:"avatar-fox"}));expect(r.error).toBeTruthy();expect(JSON.stringify(r)).not.toContain("private");});
});
