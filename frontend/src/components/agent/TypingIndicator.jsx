export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1 animate-fade-in">
      <div className="flex gap-1 bg-slate-100 px-3 py-2 rounded-2xl rounded-bl-sm">
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
