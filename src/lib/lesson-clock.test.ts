import {it,expect} from "vitest";
import {clockRemaining,liveAllows} from "./classroom";
it("сервер сааты жана өткөн монотондук убакыт эсептелет",()=>{const s={max_stage:0,paused:false,timed:true,deadline:"2026-10-25T10:01:00Z",server_now:"2026-10-25T10:00:00Z"};expect(clockRemaining(s,15000)).toBe(45);expect(clockRemaining(s,90000)).toBe(0);expect(clockRemaining({...s,paused:true,remaining_seconds:33},90000)).toBe(33);});
it("timed режимде так учурдагы бөлүк гана ачык",()=>{const s={max_stage:2,paused:false,timed:true};expect(liveAllows(s,1)).toBe(false);expect(liveAllows(s,2)).toBe(true);expect(liveAllows(s,3)).toBe(false);expect(liveAllows({...s,ended:true},2)).toBe(false);expect(liveAllows({...s,paused:true},2)).toBe(false);expect(liveAllows({...s,timed:false},1)).toBe(true);});
