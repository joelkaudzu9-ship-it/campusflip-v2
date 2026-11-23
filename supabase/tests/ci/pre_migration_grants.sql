-- What a fresh Supabase project grants by default, before the hardening migration runs.
grant all on all tables in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to public, anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to public;
