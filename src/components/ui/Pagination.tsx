import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const startItem = itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined;
  const endItem = itemsPerPage && totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : undefined;

  return (
    <div className={`flex items-center justify-between py-3 px-1 text-xs text-slate-500 ${className}`}>
      <div>
        {totalItems !== undefined ? (
          <span>
            Mostrando <strong className="text-slate-800">{startItem}</strong> a <strong className="text-slate-800">{endItem}</strong> de <strong className="text-slate-800">{totalItems}</strong> registros
          </span>
        ) : (
          <span>Página {currentPage} de {totalPages}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <span className="px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 font-semibold font-mono">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Próxima página"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};
