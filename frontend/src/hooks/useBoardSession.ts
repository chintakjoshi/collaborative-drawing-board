import { useCallback, useEffect, MutableRefObject } from 'react';
import { Shape, TextObject } from '../types/boardObjects';
import { Stroke, User } from '../types/drawing';

interface UseBoardSessionArgs {
  boardId: string | null;
  joinCode: string;
  isConnecting: boolean;
  isConnected: boolean;
  connect: (isCreating?: boolean) => void;
  disconnect: () => void;
  setBoardId: (value: string | null) => void;
  setUserId: (value: string) => void;
  setUserToken: (value: string | null) => void;
  setIsAdmin: (value: boolean) => void;
  setUsers: (value: User[] | ((prev: User[]) => User[])) => void;
  setStrokes: (value: Stroke[] | ((prev: Stroke[]) => Stroke[])) => void;
  setShapes: (value: Shape[] | ((prev: Shape[]) => Shape[])) => void;
  setTextObjects: (value: TextObject[] | ((prev: TextObject[]) => TextObject[])) => void;
  setObjectCount: (value: number | ((prev: number) => number)) => void;
  setAdminDisconnectTimer: (value: number | null) => void;
  setIsConnecting: (value: boolean) => void;
  setConnectionError: (value: string) => void;
  hasReceivedWelcomeRef: MutableRefObject<boolean>;
}

export const useBoardSession = ({
  boardId,
  joinCode,
  isConnecting,
  isConnected,
  connect,
  disconnect,
  setBoardId,
  setUserId,
  setUserToken,
  setIsAdmin,
  setUsers,
  setStrokes,
  setShapes,
  setTextObjects,
  setObjectCount,
  setAdminDisconnectTimer,
  setIsConnecting,
  setConnectionError,
  hasReceivedWelcomeRef
}: UseBoardSessionArgs) => {
  useEffect(() => {
    const savedBoardId = localStorage.getItem('boardId');
    const savedUserId = localStorage.getItem('userId');
    const savedToken = localStorage.getItem('userToken');
    const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';

    if (savedBoardId && savedUserId && savedToken) {
      console.log('Restoring session:', { savedBoardId, savedUserId, savedIsAdmin });
      setBoardId(savedBoardId);
      setUserId(savedUserId);
      setUserToken(savedToken);
      setIsAdmin(savedIsAdmin);
      setIsConnecting(true);
      localStorage.setItem('isCreating', 'false');
    }
  }, [setBoardId, setIsAdmin, setIsConnecting, setUserId, setUserToken]);

  useEffect(() => {
    if (boardId && !isConnected && isConnecting) {
      const savedBoardId = localStorage.getItem('boardId');
      const isCreatingFlag = localStorage.getItem('isCreating') === 'true';
      const isRestoringSession = (savedBoardId === boardId);
      const shouldCreate = isCreatingFlag && !isRestoringSession;

      console.log('Auto-connecting:', {
        boardId,
        isCreatingFlag,
        isRestoringSession,
        shouldCreate,
        savedBoardId
      });

      connect(shouldCreate);
      localStorage.removeItem('isCreating');
    }
  }, [boardId, isConnected, isConnecting, connect]);

  const handleCompleteDisconnect = useCallback(() => {
    disconnect();
    setBoardId(null);
    setUserId('');
    setUserToken(null);
    setIsAdmin(false);
    setUsers([]);
    setStrokes([]);
    setShapes([]);
    setTextObjects([]);
    setObjectCount(0);
    setAdminDisconnectTimer(null);
    hasReceivedWelcomeRef.current = false;

    localStorage.removeItem('boardId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('isCreating');
  }, [
    disconnect,
    hasReceivedWelcomeRef,
    setAdminDisconnectTimer,
    setBoardId,
    setIsAdmin,
    setObjectCount,
    setShapes,
    setStrokes,
    setTextObjects,
    setUserId,
    setUserToken,
    setUsers
  ]);

  useEffect(() => {
    if (!isConnecting || hasReceivedWelcomeRef.current) return;

    const timeout = setTimeout(() => {
      if (!hasReceivedWelcomeRef.current && !isConnected) {
        console.error('Connection timeout');
        setConnectionError('Failed to connect to board. Please try again.');
        setIsConnecting(false);
        handleCompleteDisconnect();
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [handleCompleteDisconnect, hasReceivedWelcomeRef, isConnected, isConnecting, setConnectionError, setIsConnecting]);

  const handleCreateBoard = useCallback(() => {
    setConnectionError('');
    setIsConnecting(true);
    hasReceivedWelcomeRef.current = false;

    localStorage.removeItem('boardId');
    localStorage.removeItem('userId');
    localStorage.removeItem('userToken');
    localStorage.removeItem('isAdmin');
    localStorage.setItem('isCreating', 'true');

    connect(true);
  }, [connect, hasReceivedWelcomeRef, setConnectionError, setIsConnecting]);

  const handleJoinBoard = useCallback(() => {
    if (joinCode.length !== 6) {
      setConnectionError('Board code must be 6 characters');
      return;
    }

    setConnectionError('');
    setIsConnecting(true);
    hasReceivedWelcomeRef.current = false;
    setBoardId(joinCode.toUpperCase());
    localStorage.setItem('isCreating', 'false');
  }, [hasReceivedWelcomeRef, joinCode, setBoardId, setConnectionError, setIsConnecting]);

  const handleLeaveBoard = useCallback(() => {
    if (window.confirm('Leave this drawing board?')) {
      handleCompleteDisconnect();
    }
  }, [handleCompleteDisconnect]);

  return {
    handleCreateBoard,
    handleJoinBoard,
    handleCompleteDisconnect,
    handleLeaveBoard
  };
};
