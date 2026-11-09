export const PUBLIC_ORIGIN="https://ellora-0217.vercel.app";
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeStudentNext(raw:unknown){if(typeof raw!=="string")return "/student";const m=/^\/(?:s|student\/assignments)\/(.+)$/.exec(raw);return m&&UUID.test(m[1])?raw:"/student";}
export function shareUrl(id:string){if(!UUID.test(id))throw Error("Тапшырманын белгиси туура эмес");return `${PUBLIC_ORIGIN}/s/${id}`;}
