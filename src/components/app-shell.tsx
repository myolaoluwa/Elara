"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, Sparkles, UserRound, X } from "lucide-react";
import { useState } from "react";
import { modules } from "@/lib/navigation";
import { SignOutButton } from "@/components/sign-out-button";

export function AppShell({ children, workspaceName, userName }: { children: React.ReactNode; workspaceName: string; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-frame">
      {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="brand"><span className="brand-symbol">E</span><span>ELARA</span></Link>
          <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {modules.slice(0, 9).map(({ label, slug, icon: Icon }) => {
            const href = slug === "dashboard" ? "/" : `/${slug}`;
            const active = pathname === href;
            return <Link href={href} onClick={() => setOpen(false)} className={`nav-item ${active ? "active" : ""}`} key={slug}><Icon size={17} /><span>{label}</span></Link>;
          })}
          <p className="nav-label second">Manage</p>
          {modules.slice(9).map(({ label, slug, icon: Icon }) => (
            <Link href={`/${slug}`} onClick={() => setOpen(false)} className={`nav-item ${pathname === `/${slug}` ? "active" : ""}`} key={slug}><Icon size={17} /><span>{label}</span></Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="workspace-avatar">{workspaceName.slice(0, 1).toUpperCase()}</div>
          <div className="workspace-copy"><strong>{workspaceName}</strong><span>{userName}</span></div>
          <SignOutButton />
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button className="menu-button" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <Link className="search-trigger" href="/search"><Search size={17} /><span>Search your workspace</span><kbd>⌘ K</kbd></Link>
          <div className="topbar-actions">
            <Link className="ask-elara" href="/command"><Sparkles size={16} /><span>Ask Elara</span></Link>
            <Link className="icon-button" href="/activity" aria-label="Activity and notifications"><Bell size={18} /></Link>
            <div className="user-avatar" aria-label={`${userName} profile`} title={userName}><UserRound size={15} /></div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
