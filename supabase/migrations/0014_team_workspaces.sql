-- Жуп/топтун жалпы иши жана ар бир окуучунун жеке түшүндүрмөсү.
begin;
create table public.team_spaces (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null references public.assignments(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 100),
 prompt text not null check(length(btrim(prompt)) between 1 and 3000),
 stage integer not null check(stage in (1,3)),
 roles text[] not null check(cardinality(roles) between 2 and 6),
 rotation integer not null default 0 check(rotation>=0),
 version integer not null default 0 check(version>=0),
 response text not null default '' check(length(response)<=10000),
 active boolean not null default true,
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 unique(id,assignment_id)
);
create index team_spaces_assignment on public.team_spaces(assignment_id);
create table public.team_members (
 team_id uuid not null,
 assignment_id uuid not null,
 student_id uuid not null references public.profiles(id) on delete cascade,
 slot integer not null check(slot between 0 and 5),
 primary key(team_id,student_id),
 unique(assignment_id,student_id),
 unique(team_id,slot),
 foreign key(team_id,assignment_id) references public.team_spaces(id,assignment_id) on delete cascade
);
create index team_members_student on public.team_members(student_id);
create table public.team_versions (
 team_id uuid not null references public.team_spaces(id) on delete cascade,
 version integer not null,
 event text not null check(event in ('created','save','rotate','submit','pause','resume')),
 response text not null,
 editor_id uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 primary key(team_id,version)
);
create index team_versions_editor on public.team_versions(editor_id);
create table public.team_notes (
 team_id uuid not null,
 student_id uuid not null,
 explanation text not null check(length(btrim(explanation)) between 1 and 5000),
 contribution text not null check(length(btrim(contribution)) between 1 and 2000),
 submitted_at timestamptz not null default now(),
 primary key(team_id,student_id),
 foreign key(team_id,student_id) references public.team_members(team_id,student_id) on delete cascade
);
alter table public.team_spaces enable row level security;
alter table public.team_members enable row level security;
alter table public.team_versions enable row level security;
alter table public.team_notes enable row level security;
revoke all on public.team_spaces,public.team_members,public.team_versions,public.team_notes from anon,authenticated;
grant select on public.team_spaces,public.team_members,public.team_versions,public.team_notes to authenticated;
create policy team_spaces_teacher on public.team_spaces for select to authenticated using(exists(select 1 from public.assignments a where a.id=assignment_id and public.is_teacher_of_class(a.class_id)));
create policy team_members_teacher on public.team_members for select to authenticated using(exists(select 1 from public.assignments a where a.id=assignment_id and public.is_teacher_of_class(a.class_id)));
create policy team_versions_teacher on public.team_versions for select to authenticated using(exists(select 1 from public.team_spaces s join public.assignments a on a.id=s.assignment_id where s.id=team_id and public.is_teacher_of_class(a.class_id)));
create policy team_notes_teacher on public.team_notes for select to authenticated using(exists(select 1 from public.team_spaces s join public.assignments a on a.id=s.assignment_id where s.id=team_id and public.is_teacher_of_class(a.class_id)));

create schema if not exists private;
-- Чакырылганда аныкталуучу жазуучу: класстан чыгып кеткендер эсепке алынбайт.
create function private.team_writer(p_team uuid) returns uuid language sql stable set search_path='' as $$
 select m.student_id from public.team_members m
 join public.team_spaces s on s.id=m.team_id
 join public.assignments a on a.id=s.assignment_id
 join public.class_members cm on cm.class_id=a.class_id and cm.student_id=m.student_id
 where m.team_id=p_team order by m.slot
 offset (select s.rotation % greatest(1,count(*)::integer) from public.team_spaces s
 left join public.team_members m on m.team_id=s.id
 left join public.assignments a on a.id=s.assignment_id
 where s.id=p_team and exists(select 1 from public.class_members cm where cm.class_id=a.class_id and cm.student_id=m.student_id)
 group by s.rotation)
 limit 1
$$;
revoke all on function private.team_writer(uuid) from public,anon,authenticated;
create function private.team_can_work(p_team uuid) returns boolean language sql stable set search_path='' as $$
 select exists(select 1 from public.team_spaces s join public.assignments a on a.id=s.assignment_id
 join public.team_members m on m.team_id=s.id and m.student_id=auth.uid()
 join public.profiles p on p.id=m.student_id and p.role='student'
 join public.class_members cm on cm.class_id=a.class_id and cm.student_id=m.student_id
 join public.attempts t on t.assignment_id=a.id and t.student_id=m.student_id
 where s.id=p_team and s.active and t.current_stage>=s.stage
 and not exists(select 1 from public.lesson_sessions l where l.assignment_id=a.id and (l.paused or l.max_stage<s.stage)))
$$;
revoke all on function private.team_can_work(uuid) from public,anon,authenticated;

create function public.create_team_space(p_assignment uuid,p_name text,p_prompt text,p_stage integer,p_members uuid[],p_roles text[]) returns text
language plpgsql security definer set search_path='' as $$
declare c_id uuid;new_id uuid;v text;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='teacher') then return 'forbidden';end if;
 select a.class_id into c_id from public.assignments a join public.classes c on c.id=a.class_id where a.id=p_assignment and c.teacher_id=auth.uid() for update of a;
 if c_id is null then return 'forbidden';end if;
 if length(btrim(p_name)) not between 1 and 100 or p_name is null or p_prompt is null or length(btrim(p_prompt)) not between 1 and 3000 or p_stage is null or p_stage not in (1,3) or p_members is null or p_roles is null or cardinality(p_members) not between 2 and 6 or cardinality(p_roles)<>cardinality(p_members) then return 'invalid';end if;
 if array_ndims(p_members)<>1 or array_ndims(p_roles)<>1 or array_lower(p_members,1)<>1 or array_lower(p_roles,1)<>1 then return 'invalid';end if;
 if (select count(distinct x) from unnest(p_members) x)<>cardinality(p_members) then return 'invalid';end if;
 foreach v in array p_roles loop if v is null or length(btrim(v)) not between 1 and 100 then return 'invalid';end if;end loop;
 if (select count(*) from public.class_members cm join public.profiles p on p.id=cm.student_id and p.role='student' where cm.class_id=c_id and cm.student_id=any(p_members))<>cardinality(p_members) then return 'invalid_members';end if;
 if (select count(*) from public.team_spaces where assignment_id=p_assignment)>=50 then return 'limit';end if;
 if exists(select 1 from public.team_members where assignment_id=p_assignment and student_id=any(p_members)) then return 'already_member';end if;
 insert into public.team_spaces(assignment_id,name,prompt,stage,roles) values(p_assignment,btrim(p_name),btrim(p_prompt),p_stage,p_roles) returning id into new_id;
 insert into public.team_members(team_id,assignment_id,student_id,slot) select new_id,p_assignment,x,(n-1)::integer from unnest(p_members) with ordinality t(x,n);
 insert into public.team_versions(team_id,version,event,response,editor_id) values(new_id,0,'created','',auth.uid());
 return 'ok';
 exception when unique_violation then return 'already_member';
end$$;
revoke all on function public.create_team_space(uuid,text,text,integer,uuid[],text[]) from public,anon;
grant execute on function public.create_team_space(uuid,text,text,integer,uuid[],text[]) to authenticated;

create function public.change_team_space(p_team uuid,p_version integer,p_action text,p_text text default null) returns text
language plpgsql security definer set search_path='' as $$
declare s public.team_spaces;teacher boolean;student boolean;
begin
 if auth.uid() is null then return 'forbidden';end if;
 select * into s from public.team_spaces where id=p_team for update;
 if not found then return 'forbidden';end if;
 teacher:=exists(select 1 from public.assignments a join public.classes c on c.id=a.class_id join public.profiles p on p.id=c.teacher_id and p.role='teacher' where a.id=s.assignment_id and c.teacher_id=auth.uid());
 student:=private.team_can_work(p_team);
 if p_action in ('save','submit') then
  if not student then return 'unavailable';end if;
  if private.team_writer(p_team) is distinct from auth.uid() then return 'not_writer';end if;
 elsif p_action in ('rotate','pause','resume') then
  if not teacher then return 'forbidden';end if;
 else return 'invalid';end if;
 if p_version is null or p_version<>s.version then return 'changed';end if;
 if p_action in ('save','submit','rotate') and s.submitted_at is not null then return 'locked';end if;
 if p_action='rotate' and not s.active then return 'unavailable';end if;
 if p_action='save' and (p_text is null or length(btrim(p_text)) not between 1 and 10000) then return 'invalid';end if;
 if p_action='submit' and length(btrim(s.response))=0 then return 'empty';end if;
 update public.team_spaces set
 response=case when p_action='save' then btrim(p_text) else response end,
 submitted_at=case when p_action='submit' then now() else submitted_at end,
 rotation=rotation+case when p_action='rotate' then 1 else 0 end,
 active=case when p_action='pause' then false when p_action='resume' then true else active end,
 version=version+1 where id=p_team;
 insert into public.team_versions(team_id,version,event,response,editor_id) select id,version,p_action,response,auth.uid() from public.team_spaces where id=p_team;
 return 'ok';
end$$;
revoke all on function public.change_team_space(uuid,integer,text,text) from public,anon;
grant execute on function public.change_team_space(uuid,integer,text,text) to authenticated;

create function public.submit_team_note(p_team uuid,p_explanation text,p_contribution text) returns text
language plpgsql security definer set search_path='' as $$
declare s public.team_spaces;
begin
 if auth.uid() is null then return 'forbidden';end if;
 select * into s from public.team_spaces where id=p_team for update;
 if not found or not private.team_can_work(p_team) then return 'unavailable';end if;
 if s.submitted_at is null then return 'not_submitted';end if;
 if p_explanation is null or p_contribution is null or length(btrim(p_explanation)) not between 1 and 5000 or length(btrim(p_contribution)) not between 1 and 2000 then return 'invalid';end if;
 if exists(select 1 from public.team_notes where team_id=p_team and student_id=auth.uid()) then return 'locked';end if;
 insert into public.team_notes(team_id,student_id,explanation,contribution) values(p_team,auth.uid(),btrim(p_explanation),btrim(p_contribution));
 return 'ok';
end$$;
revoke all on function public.submit_team_note(uuid,text,text) from public,anon;
grant execute on function public.submit_team_note(uuid,text,text) to authenticated;

create function public.my_team_spaces() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(item order by created_at desc),'[]'::jsonb) from (
 select s.created_at,jsonb_build_object('id',s.id,'assignmentId',s.assignment_id,'name',s.name,'prompt',s.prompt,'stage',s.stage,'version',s.version,'response',s.response,'submittedAt',s.submitted_at,'writerId',private.team_writer(s.id),'me',auth.uid(),
 'members',(select coalesce(jsonb_agg(jsonb_build_object('id',m.student_id,'name',p.full_name,'role',s.roles[1+(m.slot-s.rotation%cardinality(s.roles)+cardinality(s.roles))%cardinality(s.roles)]) order by m.slot),'[]'::jsonb) from public.team_members m join public.profiles p on p.id=m.student_id join public.class_members cm on cm.student_id=m.student_id and cm.class_id=a.class_id where m.team_id=s.id),
 'ownNote',(select jsonb_build_object('explanation',n.explanation,'contribution',n.contribution) from public.team_notes n where n.team_id=s.id and n.student_id=auth.uid()),
 'history',(select coalesce(jsonb_agg(jsonb_build_object('version',v.version,'event',v.event,'response',v.response) order by v.version desc),'[]'::jsonb) from (select version,event,response from public.team_versions where team_id=s.id order by version desc limit 5) v)) item
 from public.team_spaces s join public.assignments a on a.id=s.assignment_id
 where private.team_can_work(s.id) order by s.created_at desc limit 20
 ) x
$$;
revoke all on function public.my_team_spaces() from public,anon;
grant execute on function public.my_team_spaces() to authenticated;
commit;
