import { useState, useCallback } from 'react';

export const useBottomSheet = () => {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const toggle = useCallback(() => setVisible(prev => !prev), []);

  return { visible, show, hide, toggle };
};
