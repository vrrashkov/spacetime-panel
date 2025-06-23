import { useRef } from "react";

interface ConnectionState {
  isConnecting: boolean;
  isIntentionalDisconnect: boolean;
}

export const useConnectionState = () => {
  const connectionStateRef = useRef<ConnectionState>({
    isConnecting: false,
    isIntentionalDisconnect: false,
  });

  const setConnecting = (connecting: boolean) => {
    connectionStateRef.current.isConnecting = connecting;
  };

  const setIntentionalDisconnect = (intentional: boolean) => {
    connectionStateRef.current.isIntentionalDisconnect = intentional;
  };

  const isConnecting = () => connectionStateRef.current.isConnecting;
  const isIntentionalDisconnect = () =>
    connectionStateRef.current.isIntentionalDisconnect;

  return {
    setConnecting,
    setIntentionalDisconnect,
    isConnecting,
    isIntentionalDisconnect,
  };
};
