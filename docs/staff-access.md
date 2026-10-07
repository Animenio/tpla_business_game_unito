# Staff access and registration

## Roles

The public registration form does not expose a role selector.

Roles are assigned server-side:

- `student`: default for a valid UniTo account joining an open session;
- `teacher`: requires an active staff authorization for the session;
- `admin`: requires an active admin authorization for the session.

## Student registration

1. Student enters name, surname, UniTo email, password and session code.
2. The session must have `registration_open` status.
3. Supabase Auth creates the user.
4. The auth trigger creates `profiles` and a `session_members` row with role `student`.
5. The student continues to team setup.

## Teacher/admin registration

1. An existing session admin opens `/admin/teachers`.
2. The admin adds the UniTo email and selects `teacher` or `admin`.
3. The email is stored in `staff_authorizations`.
4. The staff member registers from the same public registration form using the session code.
5. The auth trigger matches the verified account email to the authorization.
6. The role is assigned server-side and the account is attached to the session.
7. Login redirects staff accounts to `/teacher`.

If the account already exists and is not part of a student team, authorization promotes it immediately.

## Security properties

- students cannot self-select `teacher` or `admin`;
- staff authorization is tied to both email and session;
- only session admins can create or revoke authorizations;
- a staff target already belonging to a student team is not promoted automatically;
- admins cannot revoke their own active authorization from the UI/RPC;
- registration access is validated server-side;
- RLS restricts the authorization table to admins of the same session;
- all staff role assignment happens in database functions/triggers, not in the browser.

## Bootstrap

The first admin of a new deployment must be bootstrapped through trusted infrastructure because there is no previous admin who can authorize them.

After the first admin exists, all subsequent teacher/admin access should be managed from `/admin/teachers` rather than by editing Supabase manually.
