"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, PanelLeftClose, PanelLeftOpen, Search, Sparkles, UserRound, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { modules } from "@/lib/navigation";
import { SignOutButton } from "@/components/sign-out-button";

const sidebarPreferenceEvent = "elara-sidebar-preference-change";
let fallbackSidebarCollapsed = false;

function subscribeToSidebarPreference(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(sidebarPreferenceEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(sidebarPreferenceEvent, onChange);
  };
}

function getSidebarPreference() {
  try {
    fallbackSidebarCollapsed = window.localStorage.getItem("elara-sidebar-collapsed") === "true";
  } catch {}
  return fallbackSidebarCollapsed;
}

function getServerSidebarPreference() {
  return false;
}

export function AppShell({ children, workspaceName, userName }: { children: React.ReactNode; workspaceName: string; userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const collapsed = useSyncExternalStore(subscribeToSidebarPreference, getSidebarPreference, getServerSidebarPreference);

  function toggleSidebar() {
    fallbackSidebarCollapsed = !collapsed;
    try {
      window.localStorage.setItem("elara-sidebar-collapsed", String(fallbackSidebarCollapsed));
    } catch {}
    window.dispatchEvent(new Event(sidebarPreferenceEvent));
  }

  return (
    <div className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}>
      {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="brand"><span className="brand-symbol">E</span><span>ELARA</span></Link>
          <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <nav id="primary-navigation" className="sidebar-navigation" aria-label="Primary navigation">
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
          <button className="desktop-nav-toggle" type="button" aria-label={collapsed ? "Show navigation" : "Hide navigation"} title={collapsed ? "Show navigation" : "Hide navigation"} aria-controls="primary-navigation" aria-expanded={!collapsed} onClick={toggleSidebar}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
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
