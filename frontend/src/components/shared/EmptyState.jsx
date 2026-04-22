import { MessageSquare } from 'lucide-react';

export default function EmptyState({ icon: Icon = MessageSquare, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 py-16 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
        <Icon className="w-6 h-6 text-slate-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
      </div>
    </div>
  );
}
