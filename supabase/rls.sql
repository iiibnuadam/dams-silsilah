-- Run once in the Supabase SQL editor after `pnpm db:migrate` has created the tables.
--
-- IMPORTANT: the app's Drizzle queries connect to Postgres directly via DATABASE_URL and
-- perform authorization in the server function layer (see src/lib/tree/access.ts) — that is
-- the primary gate. These policies are defense-in-depth for anything that reaches the
-- database through Supabase's REST/Realtime layer (which does respect RLS) instead of Drizzle.

alter table profiles enable row level security;
alter table persons enable row level security;
alter table trees enable row level security;
alter table tree_members enable row level security;
alter table relationships enable row level security;
alter table share_links enable row level security;
alter table collaborators enable row level security;
alter table audit_logs enable row level security;
alter table app_settings enable row level security;

create policy "profiles are readable by any authenticated user" on profiles
  for select to authenticated using (true);
create policy "users manage their own profile" on profiles
  for update to authenticated using (id = auth.uid());

create policy "persons are readable by any authenticated user" on persons
  for select to authenticated using (true);
create policy "authenticated users can create persons" on persons
  for insert to authenticated with check (created_by = auth.uid());
create policy "authenticated users can update persons" on persons
  for update to authenticated using (true);

create policy "owners and collaborators can read their trees" on trees
  for select to authenticated using (
    owner_id = auth.uid()
    or privacy = 'public'
    or exists (select 1 from collaborators c where c.tree_id = id and c.user_id = auth.uid())
  );
create policy "authenticated users can create trees" on trees
  for insert to authenticated with check (owner_id = auth.uid());
create policy "owners manage their trees" on trees
  for update to authenticated using (owner_id = auth.uid());
create policy "owners delete their trees" on trees
  for delete to authenticated using (owner_id = auth.uid());

create policy "tree members readable by tree owner/collaborator" on tree_members
  for select to authenticated using (
    exists (
      select 1 from trees t
      where t.id = tree_id
        and (t.owner_id = auth.uid() or t.privacy = 'public'
             or exists (select 1 from collaborators c where c.tree_id = t.id and c.user_id = auth.uid()))
    )
  );
create policy "owner/collaborator manage tree members" on tree_members
  for all to authenticated using (
    exists (
      select 1 from trees t
      where t.id = tree_id
        and (t.owner_id = auth.uid()
             or exists (select 1 from collaborators c where c.tree_id = t.id and c.user_id = auth.uid()))
    )
  );

create policy "relationships readable by tree owner/collaborator" on relationships
  for select to authenticated using (
    exists (
      select 1 from trees t
      where t.id = tree_id
        and (t.owner_id = auth.uid() or t.privacy = 'public'
             or exists (select 1 from collaborators c where c.tree_id = t.id and c.user_id = auth.uid()))
    )
  );
create policy "owner/collaborator manage relationships" on relationships
  for all to authenticated using (
    exists (
      select 1 from trees t
      where t.id = tree_id
        and (t.owner_id = auth.uid()
             or exists (select 1 from collaborators c where c.tree_id = t.id and c.user_id = auth.uid()))
    )
  );

create policy "owners manage share links" on share_links
  for all to authenticated using (
    exists (select 1 from trees t where t.id = tree_id and t.owner_id = auth.uid())
  );

create policy "owners manage collaborators" on collaborators
  for all to authenticated using (
    exists (select 1 from trees t where t.id = tree_id and t.owner_id = auth.uid())
  );
create policy "collaborators see their own membership" on collaborators
  for select to authenticated using (user_id = auth.uid());

create policy "owners read audit logs" on audit_logs
  for select to authenticated using (
    exists (select 1 from trees t where t.id = tree_id and t.owner_id = auth.uid())
  );

create policy "superadmins manage app settings" on app_settings
  for all to authenticated using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- Storage: create the bucket first (Supabase dashboard -> Storage -> New bucket "person-photos", public).
create policy "public read of person photos" on storage.objects
  for select to public using (bucket_id = 'person-photos');
create policy "authenticated users upload their own person photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'person-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );
