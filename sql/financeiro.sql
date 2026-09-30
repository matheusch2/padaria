-- ============================================================================
-- FINANCEIRO — Contas a pagar/receber, Receitas e despesas, Despesas recorrentes
-- Já aplicado no projeto Supabase da padaria (Padaria/matheus). Mantido aqui
-- como registro. É seguro rodar de novo (usa IF NOT EXISTS / OR REPLACE).
-- ============================================================================

create table if not exists despesas_recorrentes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id),
  tipo text not null default 'pagar' check (tipo in ('pagar', 'receber')),
  descricao text not null,
  categoria text,
  pessoa text,
  valor numeric(12, 2) not null check (valor > 0),
  dia_vencimento smallint not null check (dia_vencimento between 1 and 28),
  ativo boolean not null default true,
  proxima_geracao date not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id),
  tipo text not null check (tipo in ('pagar', 'receber')),
  descricao text not null,
  categoria text,
  pessoa text,
  valor numeric(12, 2) not null check (valor > 0),
  vencimento date not null,
  status text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  forma_pagamento text,
  pago_em timestamptz,
  observacao text,
  recorrente_id uuid references despesas_recorrentes(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists lancamentos_financeiros_vencimento_idx on lancamentos_financeiros (vencimento);
create index if not exists lancamentos_financeiros_status_idx on lancamentos_financeiros (status);
create index if not exists lancamentos_financeiros_tipo_idx on lancamentos_financeiros (tipo);

alter table despesas_recorrentes enable row level security;
alter table lancamentos_financeiros enable row level security;

drop policy if exists "Equipe autenticada le recorrentes" on despesas_recorrentes;
create policy "Equipe autenticada le recorrentes" on despesas_recorrentes
  for select to authenticated using (true);

drop policy if exists "Equipe autenticada grava recorrentes" on despesas_recorrentes;
create policy "Equipe autenticada grava recorrentes" on despesas_recorrentes
  for all to authenticated using (true) with check (true);

drop policy if exists "Equipe autenticada le lancamentos" on lancamentos_financeiros;
create policy "Equipe autenticada le lancamentos" on lancamentos_financeiros
  for select to authenticated using (true);

drop policy if exists "Equipe autenticada grava lancamentos" on lancamentos_financeiros;
create policy "Equipe autenticada grava lancamentos" on lancamentos_financeiros
  for all to authenticated using (true) with check (true);

-- Gera os lançamentos pendentes de toda despesa/receita recorrente cuja
-- próxima data já chegou, e avança a próxima geração em 1 mês. Chamada de
-- forma preguiçosa (lazy) sempre que as telas financeiras carregam.
create or replace function gerar_lancamentos_recorrentes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  molde record;
  data_gerar date;
begin
  for molde in
    select * from despesas_recorrentes where ativo = true and proxima_geracao <= current_date
  loop
    data_gerar := molde.proxima_geracao;

    while data_gerar <= current_date loop
      insert into lancamentos_financeiros (
        usuario_id, tipo, descricao, categoria, pessoa, valor, vencimento, status, recorrente_id
      ) values (
        molde.usuario_id, molde.tipo, molde.descricao, molde.categoria, molde.pessoa,
        molde.valor, data_gerar, 'pendente', molde.id
      );

      data_gerar := (data_gerar + interval '1 month')::date;
    end loop;

    update despesas_recorrentes set proxima_geracao = data_gerar, atualizado_em = now() where id = molde.id;
  end loop;
end;
$$;

-- SECURITY DEFINER por padrão fica executável até por quem não fez login.
-- Restringe a chamada só a usuários autenticados.
revoke execute on function gerar_lancamentos_recorrentes() from public;
revoke execute on function gerar_lancamentos_recorrentes() from anon;
grant execute on function gerar_lancamentos_recorrentes() to authenticated;
