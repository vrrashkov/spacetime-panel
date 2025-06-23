import { useRef, useCallback } from "react";

export interface EventCallbacks {
  [key: string]: ((...args: any[]) => void) | undefined;
}

export const useEventCallbacks = () => {
  const eventCallbacksRef = useRef<EventCallbacks>({});

  const registerEventCallbacks = useCallback((callbacks: EventCallbacks) => {
    eventCallbacksRef.current = { ...eventCallbacksRef.current, ...callbacks };
  }, []);

  const unregisterEventCallbacks = useCallback((callbackKeys: string[]) => {
    callbackKeys.forEach((key) => {
      delete eventCallbacksRef.current[key];
    });
  }, []);

  const getCallback = useCallback((callbackName: string) => {
    return eventCallbacksRef.current[callbackName];
  }, []);

  return {
    registerEventCallbacks,
    unregisterEventCallbacks,
    getCallback,
  };
};
