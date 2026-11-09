import {expect,it} from "vitest";
import {canRevise} from "./revisions";
it("баштапкы ойду, exit жана бекитилген жоопту кайра иштетүүгө ачпайт",()=>{const b={id:"p1",type:"open" as const,prompt:"Түшүндүр",rubric:["Далил"]};expect(canRevise(b,"practice")).toBe(true);expect(canRevise(b,"discover")).toBe(false);expect(canRevise(b,"exit")).toBe(false);expect(canRevise({...b,lockOnSubmit:true},"practice")).toBe(false);expect(canRevise({...b,rubric:[]},"practice")).toBe(false);});
