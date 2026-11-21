-- Promote an existing account to admin. Run in the Supabase SQL editor (service role).
-- Ordinary sign-up can NEVER grant admin; this is the only path.
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'REPLACE_WITH_ADMIN_EMAIL'
on conflict (user_id, role) do nothing;
