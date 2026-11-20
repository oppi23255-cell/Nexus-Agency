import React from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Language } from '../types';

export function BottomBar({
  lang,
  page,
  totalPages,
  onPageChange,
  onRefresh,
  expanded,
  onToggleExpand,
  refreshing = false,
}: {
  lang: Language;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onRefresh: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  refreshing?: boolean;
}) {
  const safeTotal = Math.max(1, totalPages);

  return (
    <div className="shrink-0 border-t border-[#202020] bg-[#151515] px-4 lg:px-5 py-2.5 flex items-center justify-between gap-3">
      {/* Start: Blue Refresh + Expand button (exact match to screenshot) */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          aria-label={lang === 'ar' ? 'تحديث' : 'Refresh'}
          className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#1b5ae2] hover:bg-[#2b68ea] text-white transition-colors cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        {onToggleExpand && (
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={lang === 'ar' ? 'تبديل العرض' : 'Toggle density'}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2a2a2a] bg-[#202020] text-[#909090] hover:text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* End: Pagination < 1 > */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#737373] hover:bg-[#252525] hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
        >
          {lang === 'ar' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        <span className="flex h-8 min-w-8 items-center justify-center rounded-[8px] bg-[#252525] px-2.5 text-[13px] font-medium font-mono-num text-white">
          {page}
        </span>

        <button
          type="button"
          disabled={page >= safeTotal}
          onClick={() => onPageChange(Math.min(safeTotal, page + 1))}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#737373] hover:bg-[#252525] hover:text-white disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
        >
          {lang === 'ar' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
