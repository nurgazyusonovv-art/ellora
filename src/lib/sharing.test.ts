import {it,expect} from "vitest";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import {safeStudentNext,shareUrl} from "./sharing";
const id="00000000-0000-0000-0000-000000000001";
it("сырткы же бузук дарекке redirect жок",()=>{for(const v of ["https://evil.test","//evil.test","/s/../../admin","/student/assignments/fake","/s/000000000000000000000000000000000000",null])expect(safeStudentNext(v)).toBe("/student");expect(safeStudentNext(`/s/${id}`)).toBe(`/s/${id}`);expect(safeStudentNext(`/student/assignments/${id}`)).toBe(`/student/assignments/${id}`);expect(()=>shareUrl("../x")).toThrow();});
it("QR сүрөтү окууда дал ошол коопсуз шилтемеге айланат",async()=>{const url=shareUrl(id),png=await QRCode.toBuffer(url,{width:256,margin:4,errorCorrectionLevel:"M"});const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});const qr=jsQR(new Uint8ClampedArray(data),info.width,info.height);expect(qr?.data).toBe(url);expect(url).toBe(`https://ellora-0217.vercel.app/s/${id}`);});
