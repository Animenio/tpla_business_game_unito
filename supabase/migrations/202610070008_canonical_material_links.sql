create or replace function private.seed_default_session_content(
  p_session_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.game_rounds (
    session_id,
    round_number,
    period_label,
    scenario_title,
    scenario_summary
  )
  values
    (
      p_session_id,
      1,
      '2026',
      'CRESCE IL PREMIUM',
      'Domanda totale stabile · Premium in crescita · Pressione sui costi e sul mix'
    ),
    (
      p_session_id,
      2,
      '2027–2028',
      'CRISI DEI COSTI E GUERRA DEI PREZZI',
      'Gomma e trasporti più cari · approvvigionamenti meno affidabili · forte pressione sui prezzi Standard'
    ),
    (
      p_session_id,
      3,
      '2029–2030',
      'OPPORTUNITÀ TECNOLOGICA E STRESS FINALE',
      'Mercato più lento · interesse crescente per EV e connected tyre · Standard debole · compliance più costosa'
    )
  on conflict (session_id, round_number) do nothing;

  insert into public.session_materials (
    session_id,
    title,
    description,
    file_type,
    source_url,
    sort_order,
    required
  )
  values
    (
      p_session_id,
      'Bilancio consolidato semplificato',
      'Conto economico · stato patrimoniale · rendiconto finanziario',
      'XLSX',
      'https://drive.google.com/file/d/1o5rr6pb9sUXsU5vGOMIDfGtPeqdG7TWG/view',
      1,
      true
    ),
    (
      p_session_id,
      'Nota integrativa 2025 — Aurora Tyres',
      'Principi contabili · dettaglio voci · capitale circolante · rischi',
      'PDF',
      'https://drive.google.com/file/d/1OCKze9lcJKEfZyNqIhb3yFk1E5F1uiD0/view',
      2,
      true
    )
  on conflict (session_id, sort_order) do update
    set title = excluded.title,
        description = excluded.description,
        file_type = excluded.file_type,
        source_url = excluded.source_url,
        required = excluded.required;
end;
$$;

update public.session_materials
set source_url = case
  when title = 'Bilancio consolidato semplificato'
    then 'https://drive.google.com/file/d/1o5rr6pb9sUXsU5vGOMIDfGtPeqdG7TWG/view'
  when title = 'Nota integrativa 2025 — Aurora Tyres'
    then 'https://drive.google.com/file/d/1OCKze9lcJKEfZyNqIhb3yFk1E5F1uiD0/view'
  else source_url
end
where title in (
  'Bilancio consolidato semplificato',
  'Nota integrativa 2025 — Aurora Tyres'
);
