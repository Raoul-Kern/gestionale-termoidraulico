-- Il rapportino chiuso deve comparire in ufficio senza ricaricare la pagina.
do $$
begin
  alter publication supabase_realtime add table rapportini;
exception
  when duplicate_object then null;
end $$;
