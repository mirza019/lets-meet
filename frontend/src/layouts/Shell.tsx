import { Link, useLocation } from "react-router-dom";
export function Shell({
  children,
  privatePage = false,
  wallpaper: wallpaperOverride,
}: {
  children: React.ReactNode;
  privatePage?: boolean;
  wallpaper?: "home" | "invite" | "planning" | "review" | "meet";
}) {
  const { pathname } = useLocation();
  const wallpaper =
    wallpaperOverride ||
    (pathname.includes("/build")
      ? "planning"
      : pathname.includes("/confirmed") || pathname.includes("/today")
        ? "meet"
        : pathname.includes("/review") || pathname.startsWith("/respond/")
          ? "review"
          : pathname.startsWith("/invite/")
            ? "invite"
            : "home");
  return (
    <div className={`shell shell-${wallpaper}`}>
      <div className={`wallpaper wallpaper-${wallpaper}`} aria-hidden="true" />
      {privatePage && <meta name="robots" content="noindex,nofollow" />}
      <nav className="nav">
        <Link to="/" className="brand">
          LET'S <i>MEET</i>
        </Link>
        <span aria-label="private">private-ish ✨</span>
      </nav>
      <main className="main">{children}</main>
      <footer className="privacy">
        <strong>Made by Mirza Shaheen Iqubal</strong>
        <br />
        Private links. No accounts. No public plans. Good.
      </footer>
    </div>
  );
}
