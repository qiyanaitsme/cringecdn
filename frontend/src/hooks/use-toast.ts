'use client';

import { useToast as useToastPrimitive } from '@/components/ui/use-toast';
import { toast as toastPrimitive } from '@/components/ui/use-toast';

export function useToast() {
  return useToastPrimitive();
}

export function toast(props: Parameters<typeof toastPrimitive>[0]) {
  return toastPrimitive(props);
}