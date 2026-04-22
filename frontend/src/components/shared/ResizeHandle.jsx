import React, { useCallback, useEffect, useRef } from 'react';

/**
 * A drag handle that sits between two resizable panels.
 * Props:
 *   onDrag(dx)  – called with pixel delta each mousemove tick
 *   direction   – 'horizontal' (default) | 'vertical'
 */
export default function ResizeHandle({ onDrag, direction = 'horizontal' }) {
  const dragging = useRef(false);
  const lastPos  = useRef(0);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    lastPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const pos  = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = pos - lastPos.current;
      lastPos.current = pos;
      if (delta !== 0) onDrag(delta);
    };

    const onMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onDrag, direction]);

  const isH = direction === 'horizontal';

  return (
    <div
      onMouseDown={onMouseDown}
      className={[
        'group relative flex-shrink-0 z-10 select-none',
        isH
          ? 'w-[5px] cursor-col-resize hover:w-[5px]'
          : 'h-[5px] cursor-row-resize',
        'bg-slate-200 hover:bg-indigo-400 transition-colors duration-150',
      ].join(' ')}
      title="Drag to resize"
    >
      {/* centre pip */}
      <div className={[
        'absolute rounded-full bg-slate-400 group-hover:bg-indigo-600 transition-colors',
        isH
          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3px] h-8'
          : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[3px] w-8',
      ].join(' ')} />
    </div>
  );
}
