import {it,expect} from "vitest";
import {GAMES,gameLesson} from "./games";
import {checkStructure,validateLesson} from "@/lib/lesson-edit";
import {studentContent} from "@/lib/student-view";
for(const g of GAMES)it(`${g.title}: түзүлүшү туура, жооптор окуучуга эрте ачылбайт`,()=>{const c=gameLesson(g);expect(checkStructure(c)).toBeNull();expect(validateLesson(g.title,c)).toEqual([]);expect(c.activityKind).toBe("game");const player=studentContent(c,{},"attempt");expect(player.stages[4].blocks.find(b=>b.type==="mcq")).toMatchObject({correct:-1});expect(c.stages[3].blocks[0]).not.toBe(g.block);});
