import Image from "next/image";
import QRCode from "qrcode";
import {shareUrl} from "@/lib/sharing";
import {CopyButton} from "./teacher-forms";
export async function ShareCard({assignmentId}:{assignmentId:string}){
 const url=shareUrl(assignmentId),qr=await QRCode.toDataURL(url,{errorCorrectionLevel:"M",margin:4,width:256});
 return <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-surface p-4"><h2 className="font-semibold">Шилтеме жана QR-код менен бөлүшүү</h2><p className="text-sm text-muted">Бул шилтеме дайындалган класстын окуучуларына гана ачылат. Киргенден кийин ошол тапшырмага өтөт; жооптор же баалар жалпыга ачылбайт.</p><a href={url} className="break-all text-sm font-semibold text-accent underline">{url}</a><div className="flex flex-wrap items-center gap-4"><Image unoptimized src={qr} width={256} height={256} alt="Сабакты же оюнду ачуу үчүн QR-код" className="h-52 w-52 max-w-full rounded-xl"/><div className="flex flex-col gap-3"><CopyButton text={url} label="Шилтемени көчүрүү"/><a href={qr} download={`ellora-${assignmentId}.png`} className="flex min-h-11 items-center justify-center rounded-xl border border-line px-4 font-semibold text-accent">QR-кодду жүктөө</a></div></div></section>;
}
