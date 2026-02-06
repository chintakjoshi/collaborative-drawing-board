import { useEffect, Dispatch, SetStateAction } from 'react';

export const useAdminDisconnectTimer = (
  adminDisconnectTimer: number | null,
  setAdminDisconnectTimer: Dispatch<SetStateAction<number | null>>
) => {
  useEffect(() => {
    if (adminDisconnectTimer === null || adminDisconnectTimer <= 0) return;

    const interval = setInterval(() => {
      setAdminDisconnectTimer(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [adminDisconnectTimer, setAdminDisconnectTimer]);
};
