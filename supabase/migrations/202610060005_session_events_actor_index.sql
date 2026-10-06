create index if not exists idx_session_events_actor_user
  on public.session_events(actor_user_id)
  where actor_user_id is not null;
