'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadState = 'idle' | 'dragging' | 'parsing' | 'done' | 'error';

type Props = {
  onFileParsed: (text: string, filename: string) => void;
  disabled?: boolean;
};

const ACCEPTED = '.csv,text/csv,application/vnd.ms-excel';

export default function CSVDropZone({ onFileParsed, disabled }: Props) {
  const [state, setState] = useState<UploadState>('idle');
  const [filename, setFilename] = useState('');
  const [error, setError] = useState('');

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
        setError('Please upload a CSV file (e.g. exported from Fresha or Square).');
        setState('error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File is too large. Please upload a CSV under 5 MB.');
        setState('error');
        return;
      }

      setFilename(file.name);
      setState('parsing');
      setError('');

      try {
        const text = await file.text();
        onFileParsed(text, file.name);
        setState('done');
      } catch {
        setError('Could not read the file. Make sure it is a valid CSV.');
        setState('error');
      }
    },
    [onFileParsed]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setState('idle');
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = '';
    },
    [processFile]
  );

  const reset = () => {
    setState('idle');
    setFilename('');
    setError('');
  };

  return (
    <div className="w-full">
      <label
        onDragEnter={(e) => { e.preventDefault(); if (!disabled) setState('dragging'); }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setState('dragging'); }}
        onDragLeave={(e) => { e.preventDefault(); setState('idle'); }}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center w-full rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-10 text-center group',
          disabled && 'opacity-50 cursor-not-allowed',
          state === 'dragging' && 'border-blue-500 bg-blue-50 scale-[1.01]',
          state === 'done' && 'border-emerald-400 bg-emerald-50/50 cursor-default',
          state === 'error' && 'border-red-300 bg-red-50/50 cursor-default',
          state === 'parsing' && 'border-blue-300 bg-blue-50/30 cursor-wait',
          state === 'idle' && 'border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30',
        )}
      >
        <input
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={handleChange}
          disabled={disabled || state === 'parsing' || state === 'done'}
        />

        {state === 'idle' || state === 'dragging' ? (
          <>
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors',
              state === 'dragging' ? 'bg-blue-100' : 'bg-gray-100 group-hover:bg-blue-100'
            )}>
              <Upload className={cn(
                'w-6 h-6 transition-colors',
                state === 'dragging' ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'
              )} />
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              {state === 'dragging' ? 'Drop your CSV file here' : 'Drag & drop your CSV file here'}
            </p>
            <p className="text-xs text-gray-400 mb-4">or click to browse your computer</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Fresha export', 'Square export', 'Any CSV file'].map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-500 font-medium">
                  {s}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-300 mt-4">Maximum file size: 5 MB</p>
          </>
        ) : state === 'parsing' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Reading your file...</p>
            <p className="text-xs text-gray-400 mt-1">{filename}</p>
          </>
        ) : state === 'done' ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold text-emerald-700">File imported successfully</p>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {filename}
            </p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); reset(); }}
              className="mt-4 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors underline underline-offset-2"
            >
              <X className="w-3 h-3" /> Upload a different file
            </button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-sm font-semibold text-red-700">Upload failed</p>
            <p className="text-xs text-red-400 mt-1 max-w-xs">{error}</p>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); reset(); }}
              className="mt-4 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors underline underline-offset-2"
            >
              <X className="w-3 h-3" /> Try again
            </button>
          </>
        )}
      </label>
    </div>
  );
}
