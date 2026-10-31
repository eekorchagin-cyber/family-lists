-- Единица измерения у товара справочника (бут, кг, уп…). SQL Editor → Run.

alter table public.catalog add column if not exists unit text;

-- PostgREST должен увидеть новую колонку сразу, без перезапуска.
notify pgrst, 'reload schema';
