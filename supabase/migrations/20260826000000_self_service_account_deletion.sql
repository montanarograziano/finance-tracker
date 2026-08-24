-- Self-service account deletion -----------------------------------------------
--
-- The browser must never receive the service-role key, so it cannot call
-- auth.admin.deleteUser(). This narrowly-scoped SECURITY DEFINER function is
-- the whole privileged boundary instead: an authenticated caller may delete
-- exactly the auth.users row named by their own JWT's `sub` claim. Every
-- user-owned table references auth.users(id) ON DELETE CASCADE, so that one
-- delete removes accounts, categories, transactions, investments, recurring
-- rules, and recurring exceptions in the same transaction.
--
-- There are no Storage buckets or other user-linked objects in this project.
-- Add explicit cleanup here before introducing any object that does not have a
-- foreign key to auth.users.
create function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  delete from auth.users where id = v_user_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'authenticated user no longer exists';
  end if;
end;
$$;

-- Functions are executable by PUBLIC unless revoked. Only a valid
-- authenticated JWT may reach this RPC; anon cannot call it, and the function
-- itself still resolves the row id from auth.uid() rather than accepting an id
-- parameter that could be confused or abused.
revoke execute on function public.delete_own_account() from public;
revoke execute on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;
