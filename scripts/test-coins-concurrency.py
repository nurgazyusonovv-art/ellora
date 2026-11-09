"""Disposable LOCAL PostgreSQL only, after migrations 0001–0010.
Usage: python3 scripts/test-coins-concurrency.py /path/to/psql /private/tmp 55441
No external database connections are allowed by this test runner.
"""
import concurrent.futures
import subprocess
import sys

psql, host, port = sys.argv[1:4]
if not host.startswith('/private/tmp'):
    raise SystemExit('Use a disposable local Unix-socket database only.')

def query(sql):
    result = subprocess.run([psql, '-h', host, '-p', port, '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-tA', '-c', sql], capture_output=True, text=True, check=True)
    return result.stdout.strip().splitlines()

query("""
insert into auth.users(id,raw_user_meta_data) values
('00000000-0000-0000-0000-000000002001','{"role":"teacher"}'),
('00000000-0000-0000-0000-000000002002','{"role":"student"}'),
('00000000-0000-0000-0000-000000002003','{"role":"student"}');
insert into classes(id,teacher_id,name,join_code) values('10000000-0000-0000-0000-000000002001','00000000-0000-0000-0000-000000002001','Race test','COINRACE');
insert into lessons(id,author_id,title,content) values('20000000-0000-0000-0000-000000002001','00000000-0000-0000-0000-000000002001','Race test','{}');
insert into assignments(id,lesson_id,class_id) values('30000000-0000-0000-0000-000000002001','20000000-0000-0000-0000-000000002001','10000000-0000-0000-0000-000000002001');
insert into attempts(assignment_id,student_id) values('30000000-0000-0000-0000-000000002001','00000000-0000-0000-0000-000000002002'),('30000000-0000-0000-0000-000000002001','00000000-0000-0000-0000-000000002003');
update attempts set current_stage=5,finished_at=now() where assignment_id='30000000-0000-0000-0000-000000002001';
""")

def buy(sid, item, hold=False):
    # The first transaction holds the wallet lock briefly to force overlapping calls.
    lock = f"select balance from coin_wallets where student_id='{sid}' for update; select pg_sleep(0.4);" if hold else ''
    return query(f"begin; {lock} set local role authenticated; set local request.jwt.claim.sub='{sid}'; select public.buy_shop_item('{item}'); commit;")

for suffix, products, expected in [('2002', ['avatar-fox', 'avatar-robot'], {'ok', 'not_enough'}), ('2003', ['avatar-fox', 'avatar-fox'], {'ok', 'already_owned'})]:
    sid = '00000000-0000-0000-0000-00000000' + suffix
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda args: buy(sid, *args), [(products[0], True), (products[1], False)]))
    statuses = {line for lines in results for line in lines if line in {'ok', 'not_enough', 'already_owned'}}
    assert statuses == expected, results
    rows = query(f"select balance=55-(select sum(price_paid) from student_items where student_id='{sid}') and earned_total=55 and balance>=0 and (select count(*) from student_items where student_id='{sid}')=1 and balance=(select sum(amount) from coin_ledger where student_id='{sid}') from coin_wallets where student_id='{sid}';")
    assert rows == ['t'], rows
    print('Concurrent purchases passed:', 'different items' if suffix == '2002' else 'same item')
