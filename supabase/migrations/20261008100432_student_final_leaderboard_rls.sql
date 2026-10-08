drop policy if exists teams_select_visible
  on public.teams;
create policy teams_select_visible
on public.teams
for select
to authenticated
using (
  private.is_team_member(id)
  or private.is_session_staff(session_id)
  or (
    exists (
      select 1
      from public.game_sessions gs
      where gs.id = public.teams.session_id
        and gs.status = 'completed'
        and gs.results_released_at is not null
    )
    and exists (
      select 1
      from public.session_members sm
      where sm.session_id = public.teams.session_id
        and sm.user_id = (select auth.uid())
        and sm.role = 'student'
    )
  )
);

drop policy if exists team_final_scores_select_visible
  on public.team_final_scores;
create policy team_final_scores_select_visible
on public.team_final_scores
for select
to authenticated
using (
  (
    private.is_team_member(team_id)
    and exists (
      select 1
      from public.game_sessions gs
      where gs.id = public.team_final_scores.session_id
        and gs.status = 'completed'
    )
  )
  or private.is_session_staff(session_id)
  or (
    exists (
      select 1
      from public.game_sessions gs
      where gs.id = public.team_final_scores.session_id
        and gs.status = 'completed'
        and gs.results_released_at is not null
    )
    and exists (
      select 1
      from public.session_members sm
      where sm.session_id = public.team_final_scores.session_id
        and sm.user_id = (select auth.uid())
        and sm.role = 'student'
    )
  )
);
