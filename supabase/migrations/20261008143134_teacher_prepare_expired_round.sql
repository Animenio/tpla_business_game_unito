create or replace function public.teacher_prepare_expired_round(
  p_round_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_session_id uuid;
  v_round_number smallint;
  v_round_status public.round_status;
  v_closes_at timestamptz;
  v_model_version text;
  v_previous_round_id uuid;
  v_team record;
  v_current public.team_round_decisions%rowtype;
  v_previous public.team_round_decisions%rowtype;
  v_fallback_count integer := 0;
  v_source text;
begin
  v_actor := auth.uid();

  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select gr.session_id,
         gr.round_number,
         gr.status,
         gr.closes_at,
         gs.model_version
    into v_session_id,
         v_round_number,
         v_round_status,
         v_closes_at,
         v_model_version
  from public.game_rounds gr
  join public.game_sessions gs on gs.id = gr.session_id
  where gr.id = p_round_id
  for update of gr;

  if v_session_id is null then
    raise exception 'ROUND_NOT_FOUND';
  end if;

  if not private.is_session_staff(v_session_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_round_status <> 'open' then
    raise exception 'ROUND_NOT_OPEN';
  end if;

  if v_closes_at is null or now() <= v_closes_at then
    raise exception 'DEADLINE_NOT_EXPIRED';
  end if;

  if v_round_number > 1 then
    select id
      into v_previous_round_id
    from public.game_rounds
    where session_id = v_session_id
      and round_number = v_round_number - 1
      and status = 'closed'
    limit 1;

    if v_previous_round_id is null then
      raise exception 'PREVIOUS_ROUND_NOT_CLOSED';
    end if;
  end if;

  for v_team in
    select t.id
    from public.teams t
    where t.session_id = v_session_id
      and t.status = 'active'
      and not exists (
        select 1
        from public.team_round_decisions d
        where d.round_id = p_round_id
          and d.team_id = t.id
          and d.status = 'submitted'
      )
  loop
    select *
      into v_current
    from public.team_round_decisions d
    where d.round_id = p_round_id
      and d.team_id = v_team.id
    limit 1;

    if found then
      update public.team_round_decisions
      set status = 'submitted',
          submitted_by = v_actor,
          submitted_at = now(),
          updated_at = now()
      where id = v_current.id
        and status = 'draft';

      v_source := 'latest_draft_locked';
    else
      if v_round_number > 1 then
        select *
          into v_previous
        from public.team_round_decisions d
        where d.round_id = v_previous_round_id
          and d.team_id = v_team.id
          and d.status = 'submitted'
        limit 1;
      else
        v_previous.id := null;
      end if;

      if v_previous.id is not null then
        insert into public.team_round_decisions (
          round_id,
          team_id,
          objective,
          hv_price_change,
          std_price_change,
          marketing_change,
          rnd_pct,
          capex_pct,
          inventory_days,
          receivable_days,
          natural_rubber_hedge,
          connected_rnd_allocation,
          status,
          submitted_by,
          submitted_at
        )
        values (
          p_round_id,
          v_team.id,
          v_previous.objective,
          v_previous.hv_price_change,
          v_previous.std_price_change,
          v_previous.marketing_change,
          v_previous.rnd_pct,
          v_previous.capex_pct,
          v_previous.inventory_days,
          v_previous.receivable_days,
          v_previous.natural_rubber_hedge,
          v_previous.connected_rnd_allocation,
          'submitted',
          v_actor,
          now()
        );

        v_source := 'previous_round_carried_forward';
      elsif v_model_version in ('aurora-tyres-v0.5.2', 'aurora-tyres-v0.5.3') then
        insert into public.team_round_decisions (
          round_id,
          team_id,
          objective,
          hv_price_change,
          std_price_change,
          marketing_change,
          rnd_pct,
          capex_pct,
          inventory_days,
          receivable_days,
          natural_rubber_hedge,
          connected_rnd_allocation,
          status,
          submitted_by,
          submitted_at
        )
        values (
          p_round_id,
          v_team.id,
          'cassa',
          0,
          0,
          case v_round_number
            when 1 then 0
            when 2 then 0.15
            else 0.10
          end,
          case v_round_number
            when 1 then 0.045
            when 2 then 0.055
            else 0.060
          end,
          case v_round_number
            when 1 then 0.065
            else 0.070
          end,
          case v_round_number
            when 2 then 160
            else 140
          end,
          34,
          case v_round_number
            when 2 then 0.70
            else 0.30
          end,
          case v_round_number
            when 3 then 0.50
            else 0.30
          end,
          'submitted',
          v_actor,
          now()
        );

        v_source := 'neutral_default';
      else
        insert into public.team_round_decisions (
          round_id,
          team_id,
          objective,
          hv_price_change,
          std_price_change,
          marketing_change,
          rnd_pct,
          capex_pct,
          inventory_days,
          receivable_days,
          natural_rubber_hedge,
          connected_rnd_allocation,
          status,
          submitted_by,
          submitted_at
        )
        values (
          p_round_id,
          v_team.id,
          'cassa',
          case v_round_number when 2 then 0.03 else 0.02 end,
          case v_round_number
            when 1 then 0
            when 2 then -0.03
            else -0.02
          end,
          case v_round_number
            when 1 then 0
            when 2 then 0.15
            else 0.10
          end,
          case v_round_number
            when 1 then 0.046
            when 2 then 0.055
            else 0.060
          end,
          case v_round_number
            when 1 then 0.065
            else 0.070
          end,
          case v_round_number
            when 1 then 135
            when 2 then 150
            else 135
          end,
          case v_round_number
            when 1 then 34
            when 2 then 33
            else 32
          end,
          case v_round_number
            when 1 then 0.50
            when 2 then 0.70
            else 0.60
          end,
          case v_round_number
            when 1 then 0.20
            when 2 then 0.30
            else 0.40
          end,
          'submitted',
          v_actor,
          now()
        );

        v_source := 'balanced_default';
      end if;
    end if;

    v_fallback_count := v_fallback_count + 1;

    insert into public.session_events (
      session_id,
      team_id,
      actor_user_id,
      event_type,
      payload
    )
    values (
      v_session_id,
      v_team.id,
      v_actor,
      'round_missing_submission_resolved',
      jsonb_build_object(
        'round_id', p_round_id,
        'round_number', v_round_number,
        'fallback_source', v_source,
        'deadline', v_closes_at
      )
    );
  end loop;

  return v_fallback_count;
end;
$$;

revoke all on function public.teacher_prepare_expired_round(uuid)
  from public, anon;
grant execute on function public.teacher_prepare_expired_round(uuid)
  to authenticated;
