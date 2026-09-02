import React, { useRef, useState } from 'react';
import { UploadCloud, Image, X, FileText, Camera, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  helperText?: string;
  accept?: string;
  value?: string | null;
  fileName?: string | null;
  onChange: (dataUrl: string | null, fileMeta?: { name: string; size: number; type: string } | null) => void;
  maxSizeMB?: number;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label = 'Foto ou Comprovante de Adesivagem',
  helperText = 'PNG, JPG, WEBP até 10MB (ou tire uma foto com a câmera)',
  accept = 'image/*',
  value,
  fileName,
  onChange,
  maxSizeMB = 10,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to FileReader if canvas context is unavailable
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 0.72 quality (~60-100KB)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  };

  const handleProcessFile = async (file: File) => {
    setError(null);

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`O arquivo é muito grande. Tamanho máximo: ${maxSizeMB}MB.`);
      return;
    }

    try {
      const result = await compressImage(file);
      onChange(result, {
        name: file.name,
        size: Math.round(result.length * 0.75), // approximate compressed size
        type: file.type.startsWith('image/') ? 'image/jpeg' : file.type,
      });
    } catch {
      setError('Erro ao processar imagem. Tente novamente.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    setError(null);
    onChange(null, null);
  };

  const isImage = value?.startsWith('data:image') || value?.includes('http') || (fileName && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName));

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {value ? (
        <div className="relative p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center gap-3">
          {isImage ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-200 dark:bg-zinc-800 shrink-0 border border-slate-300 dark:border-zinc-700">
              <img
                src={value}
                alt="Comprovante / Foto"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">{fileName || 'Arquivo / Foto anexada'}</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
              Pronto para envio
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 hover:underline cursor-pointer"
              >
                Trocar imagem
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            title="Remover arquivo"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2 ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
              : 'border-slate-300 dark:border-zinc-800 hover:border-slate-400 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-950/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center text-slate-600 dark:text-zinc-400 shadow-2xs">
            <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-zinc-200">
              Clique para enviar foto ou tire com a câmera
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
              {helperText}
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
};
