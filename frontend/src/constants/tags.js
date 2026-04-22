export const TAG_CONFIG = {
  billing:    { label: 'Billing',    color: 'bg-amber-100 text-amber-700' },
  bug:        { label: 'Bug',        color: 'bg-red-100 text-red-700' },
  feature:    { label: 'Feature',    color: 'bg-blue-100 text-blue-700' },
  general:    { label: 'General',    color: 'bg-slate-100 text-slate-700' },
  onboarding: { label: 'Onboarding', color: 'bg-green-100 text-green-700' },
  urgent:     { label: 'Urgent',     color: 'bg-rose-100 text-rose-700' },
};

export const STATUS_CONFIG = {
  open:    { label: 'Open',    color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  snoozed: { label: 'Snoozed', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
  closed:  { label: 'Closed',  color: 'bg-slate-100 text-slate-500',  dot: 'bg-slate-400' },
};

export const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: 'text-slate-500' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high:   { label: 'High',   color: 'text-red-600' },
};

export const AGENT_STATUS_CONFIG = {
  online:  { label: 'Online',  dot: 'bg-green-500',  color: 'text-green-600' },
  offline: { label: 'Offline', dot: 'bg-slate-400',  color: 'text-slate-500' },
  busy:    { label: 'Busy',    dot: 'bg-amber-500',  color: 'text-amber-600' },
};
