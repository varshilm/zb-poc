import { useRef, useState, type ChangeEvent } from 'react';
import { ImageIcon, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { loadImageFromFile } from '@/pages/DentalSimulation/utils/loadImage';

type DemoUploadMaskButtonProps = {
  onMaskReady: (maskDataUrl: string) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
  variant?: 'default' | 'outline';
};

export function DemoUploadMaskButton({
  onMaskReady,
  disabled = false,
  label = 'Upload color mask',
  description,
  className,
  variant = 'outline',
}: DemoUploadMaskButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsLoading(true);
    setError(null);
    try {
      const prepared = await loadImageFromFile(file);
      onMaskReady(prepared.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load color mask.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || isLoading}
        onChange={(event) => void handleChange(event)}
      />
      <Button
        type="button"
        variant={variant}
        disabled={disabled || isLoading}
        className="min-h-11"
        onClick={() => inputRef.current?.click()}
      >
        {isLoading ? (
          <Upload className="size-4 animate-pulse" />
        ) : (
          <ImageIcon className="size-4" />
        )}
        {isLoading ? 'Loading mask…' : label}
      </Button>
      {description ? <p className="text-xs text-slate-600">{description}</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
