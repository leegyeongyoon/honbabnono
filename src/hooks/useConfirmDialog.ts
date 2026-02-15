import { useState, useCallback } from 'react';
import type { IconName } from '../components/SimpleIcon';

interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'default' | 'danger' | 'warning';
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ShowDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger' | 'warning';
  icon?: IconName;
}

export const useConfirmDialog = () => {
  const [dialog, setDialog] = useState<ConfirmDialogState>({
    visible: false,
    title: '',
    message: '',
    confirmLabel: '확인',
    cancelLabel: '취소',
    variant: 'default',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showDialog = useCallback(
    (options: ShowDialogOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setDialog({
          visible: true,
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel || '확인',
          cancelLabel: options.cancelLabel || '취소',
          variant: options.variant || 'default',
          icon: options.icon,
          onConfirm: () => {
            setDialog((prev) => ({ ...prev, visible: false }));
            resolve(true);
          },
          onCancel: () => {
            setDialog((prev) => ({ ...prev, visible: false }));
            resolve(false);
          },
        });
      }),
    []
  );

  const confirm = useCallback(
    (title: string, message: string) =>
      showDialog({ title, message }),
    [showDialog]
  );

  const confirmDanger = useCallback(
    (title: string, message: string) =>
      showDialog({ title, message, variant: 'danger', confirmLabel: '삭제', icon: 'trash-2' }),
    [showDialog]
  );

  const hideDialog = useCallback(() => {
    setDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  return { dialog, showDialog, confirm, confirmDanger, hideDialog };
};
