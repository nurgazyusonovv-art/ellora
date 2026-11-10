-- Класстык рейтингдин режими (геймификация, 4-этап):
--   weekly — акыркы 7 күндөгү жылдыздар + күнүмдүк кайталоолор (демейки: ар жума баары кайра башташат);
--   xp     — мурункудай жалпы XP;
--   off    — окуучуларга көрсөтүлбөйт.
-- Мурда жашырылган класстар (show_leaderboard = false) «off» болот. show_leaderboard мурунку код үчүн сакталат.
begin;

alter table public.classes
  add column leaderboard_mode text not null default 'weekly' check (leaderboard_mode in ('weekly', 'xp', 'off'));

update public.classes set leaderboard_mode = 'off' where show_leaderboard = false;

commit;
