import React, { createContext, useContext, useMemo } from 'react';
import { usePendingUploads } from '../hooks/usePendingUploads';

const PendingUploadContext = createContext(null);

export function PendingUploadProvider({ children }) {
  const pendingUploads = usePendingUploads();
  const value = useMemo(() => pendingUploads, [pendingUploads]);

  return (
    <PendingUploadContext.Provider value={value}>
      {children}
    </PendingUploadContext.Provider>
  );
}

export function usePendingUploadContext() {
  const context = useContext(PendingUploadContext);
  if (!context) {
    throw new Error('usePendingUploadContext must be used within a PendingUploadProvider');
  }
  return context;
}

export default PendingUploadContext;
