import { logoutAction } from "@/app/auth/actions";

interface AppHeaderProps {
  section: string;
  sessionCode: string;
  userName: string;
}

export function AppHeader({
  section,
  sessionCode,
  userName,
}: AppHeaderProps) {
  return (
    <>
      <div className="brand-bar" aria-hidden="true" />
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-title">CFO AI Business Game</div>
          <div className="header-divider" aria-hidden="true" />
          <div className="header-section">{section}</div>
          <div className="header-spacer" />
          <div className="session-pill">{sessionCode}</div>
          <form action={logoutAction}>
            <button className="user-button" type="submit" title="Disconnetti">
              {userName}
            </button>
          </form>
        </div>
      </header>
    </>
  );
}
