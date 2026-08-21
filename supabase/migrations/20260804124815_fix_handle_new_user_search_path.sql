/*
# Fix handle_new_user trigger function

## Problem
The `handle_new_user` SECURITY DEFINER function was missing `SET search_path = public`,
which causes Supabase to fail with "Database error saving new user" during signup
because the function cannot reliably resolve the `profiles` table.

## Changes
- Recreates `handle_new_user` with `SET search_path = public` to ensure the
  INSERT into `profiles` resolves correctly from the auth trigger context.
- Recreates the trigger to ensure it points to the updated function.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
