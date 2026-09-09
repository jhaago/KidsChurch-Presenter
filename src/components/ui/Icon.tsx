import type { SVGProps } from 'react';

export type IconName =
  | 'search'
  | 'text'
  | 'theme'
  | 'show'
  | 'edit'
  | 'reflow'
  | 'bible'
  | 'more'
  | 'media'
  | 'looks'
  | 'audience'
  | 'stage'
  | 'folder'
  | 'playlist'
  | 'presentation'
  | 'timer'
  | 'interactive'
  | 'web'
  | 'audio'
  | 'message'
  | 'chevron'
  | 'previous'
  | 'next'
  | 'copy'
  | 'grid'
  | 'layers';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, ...props }: IconProps) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };

  switch (name) {
    case 'search':
      return <svg {...common}><circle cx="10.5" cy="10.5" r="6.3"/><path d="m15.1 15.1 4.7 4.7"/></svg>;
    case 'text':
      return <svg {...common}><path d="M5 5h14M12 5v14M8.5 19h7"/></svg>;
    case 'theme':
      return <svg {...common}><path d="M4 7.2 12 3l8 4.2-8 4.2L4 7.2Z"/><path d="m5.5 11 6.5 3.5 6.5-3.5M5.5 15l6.5 3.5 6.5-3.5"/></svg>;
    case 'show':
      return <svg {...common}><rect x="3" y="5" width="18" height="12" rx="1.5"/><path d="m9.5 20 2.5-3 2.5 3"/></svg>;
    case 'edit':
      return <svg {...common}><path d="m5 19 3.7-.8L19 7.9 16.1 5 5.8 15.3 5 19Z"/><path d="m14.7 6.4 2.9 2.9"/></svg>;
    case 'reflow':
      return <svg {...common}><path d="M4 6h11a4 4 0 0 1 0 8H8"/><path d="m11 11-3 3 3 3M4 10h6"/></svg>;
    case 'bible':
      return <svg {...common}><path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12H7a2 2 0 0 1-2-2V4.5Z"/><path d="M7 19a2 2 0 0 1 0-4h11M10 7h4M12 7v5"/></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></svg>;
    case 'media':
      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="m9 8 7 4-7 4V8Z" fill="currentColor" stroke="none"/></svg>;
    case 'looks':
      return <svg {...common}><path d="M3.5 12s3.1-5.5 8.5-5.5 8.5 5.5 8.5 5.5-3.1 5.5-8.5 5.5S3.5 12 3.5 12Z"/><circle cx="12" cy="12" r="2.4"/></svg>;
    case 'audience':
      return <svg {...common}><rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16.5V20"/></svg>;
    case 'stage':
      return <svg {...common}><path d="M4 5h16v12H4zM8 21l4-4 4 4"/><path d="M8 9h8M8 12h5"/></svg>;
    case 'folder':
      return <svg {...common}><path d="M3.5 6.5h6l2 2H21v9.5a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 4 18V6.5Z"/></svg>;
    case 'playlist':
      return <svg {...common}><path d="M9 6h11M9 12h11M9 18h7"/><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none"/></svg>;
    case 'presentation':
      return <svg {...common}><rect x="4" y="4" width="16" height="14" rx="1"/><path d="M8 21h8M12 18v3"/></svg>;
    case 'timer':
      return <svg {...common}><circle cx="12" cy="13" r="7"/><path d="M9 3h6M12 6v7l3 2"/></svg>;
    case 'interactive':
      return <svg {...common}><path d="m12 3 2.3 5.1L20 9l-4 4 1 5.7-5-2.7-5 2.7L8 13 4 9l5.7-.9L12 3Z"/></svg>;
    case 'web':
      return <svg {...common}><circle cx="12" cy="12" r="8.5"/><path d="M3.8 12h16.4M12 3.5c2.1 2.3 3.2 5.1 3.2 8.5S14.1 18.2 12 20.5C9.9 18.2 8.8 15.4 8.8 12S9.9 5.8 12 3.5Z"/></svg>;
    case 'audio':
      return <svg {...common}><path d="M9 17V7l10-2v10"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>;
    case 'message':
      return <svg {...common}><path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 9h8M8 13h5"/></svg>;
    case 'chevron':
      return <svg {...common}><path d="m8 10 4 4 4-4"/></svg>;
    case 'previous':
      return <svg {...common}><path d="m14 6-6 6 6 6"/></svg>;
    case 'next':
      return <svg {...common}><path d="m10 6 6 6-6 6"/></svg>;
    case 'copy':
      return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M16 8V5H5v11h3"/></svg>;
    case 'grid':
      return <svg {...common}><rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><rect x="14" y="14" width="6" height="6"/></svg>;
    case 'layers':
      return <svg {...common}><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 17l8 4 8-4"/></svg>;
  }
}
