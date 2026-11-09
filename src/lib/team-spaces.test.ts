import {describe,expect,it} from "vitest";
import {teamRole,teamWriter} from "./team-spaces";
describe("топтун ролдору",()=>{
 it("үч роль кезеги менен өтөт, жазуучуга биринчи роль тиет",()=>{const roles=["Жазуучу","Текшерүүчү","Баяндамачы"];expect([0,1,2].map(i=>teamRole(roles,i,1))).toEqual(["Баяндамачы","Жазуучу","Текшерүүчү"]);expect(teamRole(roles,2,5)).toBe("Жазуучу");});
 it("жазуучу слот боюнча иреттелип, класстан чыккандар эсептелбейт",()=>{const members=[{student_id:"b",slot:1},{student_id:"a",slot:0},{student_id:"c",slot:2}];expect(teamWriter(members,new Set(["a","b","c"]),1)).toBe("b");expect(teamWriter(members,new Set(["a","c"]),1)).toBe("c");expect(teamWriter(members,new Set(),1)).toBeNull();expect(members[0].student_id).toBe("b");});
});
