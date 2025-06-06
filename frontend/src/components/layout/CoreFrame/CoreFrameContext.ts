import { createContext, useCallback, useState } from 'react';

export interface CoreFrameContextValue {
  optionsOpen: boolean;
  scrimVisible: boolean;
  showButtonVisible: boolean;
  forceClosed: boolean;
  fixedSidebarOpen: boolean;
  setOptionsOpen: (open: boolean) => void;
  setForceClosed: (forceClosed: boolean) => void;
}

export function createCoreFrameContextValue(): CoreFrameContextValue {
  // sidebar-related state
  const [optionsOpen, _setOptionsOpen] = useState(false);
  const setOptionsOpen = useCallback((bool: boolean) => {
    _setOptionsOpen(bool);
    setForceClosed(false, false);
    setScrimVisible(bool);
    setShowButtonVisible(!bool);
  }, []);

  const [scrimVisible, _setScrimVisible] = useState(false);
  const setScrimVisible = useCallback((bool: boolean) => {
    if (bool) {
      _setScrimVisible(true);
    } else {
      setTimeout(() => {
        _setScrimVisible(false);
      }, 300);
    }
  }, []);

  const [showButtonVisible, _setShowButtonVisible] = useState(true);
  const setShowButtonVisible = useCallback((bool: boolean) => {
    if (bool) {
      setTimeout(() => {
        _setShowButtonVisible(true);
      }, 120);
    } else {
      _setShowButtonVisible(false);
    }
  }, []);

  const [forceClosed, _setForceClosed] = useState(false);
  const setForceClosed = useCallback(
    (bool: boolean, controlShowButton = true) => {
      _setForceClosed(bool);
      setFixedSidebarOpen(!bool);
      if (controlShowButton) {
        setShowButtonVisible(bool);
      }
    },
    [_setForceClosed]
  );

  const [fixedSidebarOpen, setFixedSidebarOpen] = useState(true);

  return {
    optionsOpen,
    scrimVisible,
    showButtonVisible,
    forceClosed,
    setOptionsOpen,
    setForceClosed,
    fixedSidebarOpen,
  };
}

export const CoreFrameContext = createContext<CoreFrameContextValue>({} as CoreFrameContextValue);
