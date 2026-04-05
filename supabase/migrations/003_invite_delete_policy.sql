-- Allow admins to delete invite tokens
create policy "Admins can delete invite tokens"
  on public.invite_tokens for delete
  to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
