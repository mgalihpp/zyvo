interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

interface Window {
  snap?: {
    pay: (token: string, callbacks?: SnapCallbacks) => void;
    hide: () => void;
  };
}
