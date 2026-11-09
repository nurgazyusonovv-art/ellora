-- Монета — оюн сыйлыгы. XP, тест упайы жана баалар өзгөрбөйт.
begin;
create schema if not exists private;

create table public.coin_wallets (
 student_id uuid primary key references public.profiles(id) on delete cascade,
 balance int not null default 0 check(balance >= 0),
 earned_total int not null default 0 check(earned_total >= balance),
 updated_at timestamptz not null default now()
);
create table public.shop_items (
 id text primary key,
 kind text not null check(kind in ('avatar','frame','title')),
 name text not null,
 description text not null,
 price int not null check(price > 0),
 active boolean not null default true
);
create table public.student_items (
 student_id uuid not null references public.profiles(id) on delete cascade,
 item_id text not null references public.shop_items(id),
 price_paid int not null check(price_paid > 0),
 acquired_at timestamptz not null default now(),
 primary key(student_id,item_id)
);
create table public.student_equipment (
 student_id uuid not null references public.profiles(id) on delete cascade,
 slot text not null check(slot in ('avatar','frame','title')),
 item_id text,
 primary key(student_id,slot),
 foreign key(student_id,item_id) references public.student_items(student_id,item_id)
);
create table public.coin_ledger (
 id bigint generated always as identity primary key,
 student_id uuid not null references public.profiles(id) on delete cascade,
 source_key text not null,
 amount int not null check(amount <> 0),
 reason text not null,
 created_at timestamptz not null default now(),
 unique(student_id,source_key)
);
create index coin_ledger_student_time on public.coin_ledger(student_id,created_at desc,id desc);
create index student_equipment_owned_item on public.student_equipment(student_id,item_id);
create index student_items_item_idx on public.student_items(item_id);

alter table public.coin_wallets enable row level security;
alter table public.shop_items enable row level security;
alter table public.student_items enable row level security;
alter table public.student_equipment enable row level security;
alter table public.coin_ledger enable row level security;
revoke all on public.coin_wallets,public.shop_items,public.student_items,public.student_equipment,public.coin_ledger from anon,authenticated;
grant select on public.coin_wallets,public.shop_items,public.student_items,public.student_equipment,public.coin_ledger to authenticated;
create policy "own_wallet" on public.coin_wallets for select to authenticated using(student_id=(select auth.uid()));
create policy "shop_catalog" on public.shop_items for select to authenticated using(true);
create policy "own_items" on public.student_items for select to authenticated using(student_id=(select auth.uid()));
create policy "own_equipment" on public.student_equipment for select to authenticated using(student_id=(select auth.uid()));
create policy "own_coin_history" on public.coin_ledger for select to authenticated using(student_id=(select auth.uid()));

insert into public.shop_items(id,kind,name,description,price) values
 ('avatar-fox','avatar','Тапкыч түлкү','Профилиңе тапкыч түлкүнүн белгисин танда.',30),
 ('avatar-robot','avatar','Робот изилдөөчү','Жаңы нерселерди сынаган роботтун белгиси.',45),
 ('frame-lilac','frame','Кызгылт көк алкак','Аватарыңа кызгылт көк алкак кош.',25),
 ('frame-amber','frame','Алтын түстүү алкак','Аватарыңа жылуу алтын түстүү алкак кош.',40),
 ('title-curious','title','Изденүүчү','Профилиңе «Изденүүчү» аталышын кош.',20),
 ('title-builder','title','Чечим жаратуучу','Профилиңе «Чечим жаратуучу» аталышын кош.',50);

-- Капчык алгач кулпуланат: сыйлык жана сатып алуу бирдей иретте иштейт.
create function private.credit_stage_coins(sid uuid,lid uuid,stage_idx int) returns void
language plpgsql security definer set search_path='' as $$
declare reward int; inserted_id bigint;
begin
 if stage_idx not between 0 and 4 then return; end if;
 reward := (array[5,15,10,15,10])[stage_idx+1];
 insert into public.coin_wallets(student_id) values(sid) on conflict do nothing;
 perform 1 from public.coin_wallets where student_id=sid for update;
 insert into public.coin_ledger(student_id,source_key,amount,reason)
 values(sid,'lesson:'||lid::text||':stage:'||stage_idx::text,reward,'Сабактын '||(stage_idx+1)::text||'-бөлүгү')
 on conflict(student_id,source_key) do nothing returning id into inserted_id;
 if inserted_id is not null then
  update public.coin_wallets set balance=balance+reward,earned_total=earned_total+reward,updated_at=now() where student_id=sid;
 end if;
end; $$;
revoke all on function private.credit_stage_coins(uuid,uuid,int) from public,anon,authenticated;

create function private.reward_attempt_progress() returns trigger
language plpgsql security definer set search_path='' as $$
declare lid uuid; idx int;
begin
 if new.student_id<>old.student_id or new.assignment_id<>old.assignment_id then return new; end if;
 if not exists(select 1 from public.profiles where id=new.student_id and role='student') then return new; end if;
 select lesson_id into lid from public.assignments where id=new.assignment_id;
 if lid is null then return new; end if;
 for idx in greatest(0,old.current_stage)..least(4,new.current_stage-1) loop
  if idx<4 or new.finished_at is not null then perform private.credit_stage_coins(new.student_id,lid,idx); end if;
 end loop;
 return new;
end; $$;
revoke all on function private.reward_attempt_progress() from public,anon,authenticated;
create trigger award_attempt_coins after update of current_stage,finished_at on public.attempts
 for each row execute function private.reward_attempt_progress();

create function public.buy_shop_item(p_item text) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); item public.shop_items%rowtype; coins int;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and role='student') then return 'forbidden'; end if;
 select * into item from public.shop_items where id=p_item and active;
 if not found then return 'unavailable'; end if;
 insert into public.coin_wallets(student_id) values(uid) on conflict do nothing;
 select balance into coins from public.coin_wallets where student_id=uid for update;
 if exists(select 1 from public.student_items where student_id=uid and item_id=p_item) then return 'already_owned'; end if;
 if coins<item.price then return 'not_enough'; end if;
 insert into public.student_items(student_id,item_id,price_paid) values(uid,p_item,item.price);
 insert into public.coin_ledger(student_id,source_key,amount,reason) values(uid,'purchase:'||p_item,-item.price,'Сатып алуу: '||item.name);
 update public.coin_wallets set balance=balance-item.price,updated_at=now() where student_id=uid;
 return 'ok';
end; $$;
revoke all on function public.buy_shop_item(text) from public,anon;
grant execute on function public.buy_shop_item(text) to authenticated;

create function public.equip_shop_item(p_slot text,p_item text default null) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and role='student') then return 'forbidden'; end if;
 if p_slot is null or p_slot not in ('avatar','frame','title') then return 'unavailable'; end if;
 if p_item is not null and not exists(select 1 from public.student_items i join public.shop_items s on s.id=i.item_id where i.student_id=uid and i.item_id=p_item and s.kind=p_slot) then return 'not_owned'; end if;
 insert into public.student_equipment(student_id,slot,item_id) values(uid,p_slot,p_item)
 on conflict(student_id,slot) do update set item_id=excluded.item_id;
 return 'ok';
end; $$;
revoke all on function public.equip_shop_item(text,text) from public,anon;
grant execute on function public.equip_shop_item(text,text) to authenticated;

-- Эски прогресс да эсептелет. Бир сабак бир нече класста болсо да бир гана сыйлык.
do $$
declare r record;
begin
 for r in select distinct t.student_id,a.lesson_id,s.idx from public.attempts t
 join public.assignments a on a.id=t.assignment_id join public.profiles p on p.id=t.student_id and p.role='student'
 cross join lateral generate_series(0,least(4,t.current_stage-1)) as s(idx)
 where s.idx<4 or t.finished_at is not null
 loop perform private.credit_stage_coins(r.student_id,r.lesson_id,r.idx); end loop;
end; $$;
commit;
