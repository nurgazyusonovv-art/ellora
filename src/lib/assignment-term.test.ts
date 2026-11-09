import {it,expect} from "vitest";
import {assignmentTerm,schoolYear} from "./assignment-term";
const form=(q:string,k="daily")=>{const f=new FormData();f.set("quarter",q);f.set("academic_year","2026");f.set("work_kind",k);return f;};
it("оюн баага айланбайт, чейректик ишке чейрек милдеттүү",()=>{expect(assignmentTerm(form("1","quarterly"),"game")).toMatchObject({work_kind:"game"});expect(assignmentTerm(form(""),"quarterly")).toHaveProperty("error");expect(assignmentTerm(form(""))).toMatchObject({academic_year:null,quarter:null});expect(assignmentTerm(form("5"))).toHaveProperty("error");});
it("окуу жылы Бишкек убактысы боюнча башталат",()=>{expect(schoolYear(new Date("2026-07-31T20:00:00Z"))).toBe(2026);expect(schoolYear(new Date("2026-01-01T00:00:00Z"))).toBe(2025);});
