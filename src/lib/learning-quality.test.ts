import {describe,it,expect} from "vitest";
import {learningQuality,type QualityAttempt} from "./learning-quality";
const a=(student_id:string,assignment_id:string,exit_score:number|null,exit_total:number|null,finished_at:string|null="2026-10-25"):QualityAttempt=>({id:student_id+assignment_id,student_id,assignment_id,exit_score,exit_total,finished_at});
describe("Класстын тест далилдери",()=>{
 it("тест далили жокту нөл менен алмаштырбайт жана камтууну көрсөтөт",()=>{const r=learningQuality(["a","b"],["x"],[a("a","x",4,5)]);expect(r.mean).toBe(80);expect(r.quality).toBe(100);expect(r.coverage).toBe(50);expect(r.completion).toBe(50);expect(r.rows[1].mean).toBeNull();});
 it("ар окуучуга бирдей салмак берет жана тегеректөөдөн мурун чек текшерет",()=>{const r=learningQuality(["a","b"],["x","y"],[a("a","x",2,3),a("a","y",2,3),a("b","x",1,1)],67);expect(r.mean).toBeCloseTo(83.333);expect(r.meets).toBe(1);});
 it("башка класс/чыгып кеткен окуучу/бүтпөгөн жана бузук тест кирбейт",()=>{const r=learningQuality(["a"],["x","y"],[a("a","outside",1,1),a("old","x",1,1),a("a","x",1,1,null),a("a","y",3,0)]);expect(r.mean).toBeNull();expect(r.assessed).toBe(0);expect(r.completion).toBe(50);});
 it("бош класста бөлүү катасы жана жасалма нөл жок",()=>{expect(learningQuality([],[],[]).quality).toBeNull();expect(learningQuality(["a"],[],[]).completion).toBeNull();});
 it("кайталанган аракетти үнсүз санабайт",()=>expect(()=>learningQuality(["a"],["x"],[a("a","x",1,1),a("a","x",0,1)])).toThrow());
});
