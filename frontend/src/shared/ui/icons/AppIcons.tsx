import type { ReactNode } from 'react';

interface IconBaseProps {
  children: ReactNode;
  size?: number;
}

function IconBase({ children, size = 20 }: IconBaseProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function LogoIcon() {
  return (
    <IconBase size={28}>
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Z" />
      <path d="M4 22a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M10 6h8v4h-8Z" />
      <path d="M18 14h-8" />
      <path d="M15 18h-5" />
    </IconBase>
  );
}

export function DashboardIcon() {
  return (
    <IconBase>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </IconBase>
  );
}

export function ArticlesIcon() {
  return (
    <IconBase>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 13H8" />
      <path d="M16 17H8" />
      <path d="M16 13h-2" />
    </IconBase>
  );
}

export function CompaniesIcon() {
  return (
    <IconBase>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M12 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M12 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
    </IconBase>
  );
}

export function TagsIcon() {
  return (
    <IconBase>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 12l10 5 10-5" />
      <path d="M2 17l10 5 10-5" />
    </IconBase>
  );
}

export function QueueIcon() {
  return (
    <IconBase>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </IconBase>
  );
}

export function SettingsIcon() {
  return (
    <IconBase>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function FileIcon() {
  return (
    <IconBase>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h2" />
      <path d="M14 13h2" />
      <path d="M8 17h8" />
    </IconBase>
  );
}

export function UserIcon() {
  return (
    <IconBase>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="5" />
    </IconBase>
  );
}

export function ShieldIcon() {
  return (
    <IconBase>
      <path d="M12 2 5 5v6c0 5 3.5 9.5 7 11 3.5-1.5 7-6 7-11V5l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.7-3.8" />
    </IconBase>
  );
}

export function MenuIcon() {
  return (
    <IconBase size={24}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </IconBase>
  );
}

export function EmptyStateIcon() {
  return (
    <IconBase size={48}>
      <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
      <path d="M8 15h8" strokeWidth="1.5" />
      <path d="M9 9h.01" strokeWidth="1.5" />
      <path d="M15 9h.01" strokeWidth="1.5" />
    </IconBase>
  );
}
