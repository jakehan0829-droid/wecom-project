insert into org (id, name)
values ('org_demo', '演示机构')
on conflict (id) do nothing;

insert into user_account (id, org_id, name, mobile, password_hash)
values ('user_demo_assistant', 'org_demo', '演示助理', '13800000000', 'demo123456')
on conflict (mobile) do nothing;
