"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Download, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { modules, navigationGroups } from "@/lib/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { ElaraBrand, ElaraMark } from "@/components/elara-logo";

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

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function AppShell({ children, workspaceName, userName }: { children: React.ReactNode; workspaceName: string; userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMode, setInstallMode] = useState<"native" | "manual" | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const collapsed = useSyncExternalStore(subscribeToSidebarPreference, getSidebarPreference, getServerSidebarPreference);
  const currentModule = modules.find(({ slug }) => slug === "dashboard" ? pathname === "/" : pathname === `/${slug}` || pathname.startsWith(`/${slug}/`));

  useEffect(() => {
    const setStandaloneState = () => {
      const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      const isSecure = window.isSecureContext || window.location.hostname === "localhost";
      const supportsNativePrompt = "beforeinstallprompt" in window;

      if (!isStandalone && isSecure && supportsNativePrompt) {
        setInstallMode("native");
        return;
      }

      if (!isStandalone && isSecure) {
        setInstallMode("manual");
      } else {
        setInstallMode(null);
      }
    };

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setInstallMode("native");
    };

    const handleAppInstalled = () => setInstallMode(null);

    setStandaloneState();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (installEvent) {
      installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
      return;
    }

    if (installMode === "manual") {
      window.alert("Use your browser menu: Share or Menu → Add to Home Screen.");
    }
  }

  useEffect(() => {
    function openSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/search");
      }
    }
    window.addEventListener("keydown", openSearch);
    return () => window.removeEventListener("keydown", openSearch);
  }, [router]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const links = sidebarRef.current?.querySelectorAll<HTMLElement>('a, button:not([disabled])');
    links?.[0]?.focus();
    document.body.style.overflow = "hidden";
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !links?.length) return;
      const first = links[0];
      const last = links[links.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", handleKey); previousFocus?.focus(); };
  }, [open]);

  function toggleSidebar() {
    fallbackSidebarCollapsed = !collapsed;
    try {
      window.localStorage.setItem("elara-sidebar-collapsed", String(fallbackSidebarCollapsed));
    } catch {}
    window.dispatchEvent(new Event(sidebarPreferenceEvent));
  }

  return (
    <div className={`app-frame ${collapsed ? "sidebar-collapsed" : ""}`}>
      <a className="skip-link" href="#workspace-content">Skip to content</a>
      {open && <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside ref={sidebarRef} role={open ? "dialog" : undefined} aria-modal={open ? true : undefined} aria-label="Workspace navigation" className={`sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-row">
          <Link href="/" className="brand"><ElaraBrand /></Link>
          <button className="mobile-close" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={19} /></button>
        </div>
        <nav id="primary-navigation" className="sidebar-navigation" aria-label="Primary navigation">
          {navigationGroups.map((group) => <div className="nav-group" key={group.label}>
          <p className="nav-label">{group.label}</p>
          {group.slugs.map((groupSlug) => modules.find(({ slug }) => slug === groupSlug)!).map(({ label, slug, icon: Icon }) => {
            const href = slug === "dashboard" ? "/" : `/${slug}`;
            const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
            return <Link href={href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)} className={`nav-item ${active ? "active" : ""}`} key={slug}><Icon size={17} /><span>{label}</span></Link>;
          })}</div>)}
        </nav>
        <div className="sidebar-footer">
          <div className="workspace-avatar">{workspaceName.slice(0, 1).toUpperCase()}</div>
          <div className="workspace-copy"><strong>{workspaceName}</strong><span>{userName}</span></div>
          <SignOutButton />
        </div>
      </aside>

      <div className="main-column" inert={open}>
        <header className="topbar">
          <button className="desktop-nav-toggle" type="button" aria-label={collapsed ? "Show navigation" : "Hide navigation"} title={collapsed ? "Show navigation" : "Hide navigation"} aria-controls="primary-navigation" aria-expanded={!collapsed} onClick={toggleSidebar}>{collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}</button>
          <button className="menu-button" aria-label="Open navigation" onClick={() => setOpen(true)}><Menu size={20} /></button>
          <span className="topbar-location">{currentModule?.label || "Workspace"}</span>
          <Link className="search-trigger" href="/search"><Search size={17} /><span>Search your workspace</span><kbd>⌘ K</kbd></Link>
          <div className="topbar-actions">
            {(installMode === "native" || installMode === "manual") && (
              <button type="button" className="quiet-button" onClick={handleInstallClick}>
                <Download size={15} />{installMode === "native" ? "Install app" : "Add to Home Screen"}
              </button>
            )}
            <Link className="ask-elara" href="/command" aria-label="Ask Elara"><ElaraMark className="assistant-mark" /><span>Ask Elara</span></Link>
            <Link className="icon-button" href="/activity" aria-label="Activity and notifications"><Bell size={18} /></Link>
            <Link className="user-avatar" href="/settings" aria-label={`${userName} profile settings`} title={userName}>{userName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</Link>
          </div>
        </header>
        <main id="workspace-content" className="content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}
