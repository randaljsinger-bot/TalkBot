import { useEffect, useState, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface WebSocketMessage {
  type: 'message' | 'chunk' | 'complete' | 'typing' | 'error';
  content?: string;
  message?: any;
  isTyping?: boolean;
}

export function useWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();
  const messageHandlersRef = useRef<((message: WebSocketMessage) => void)[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'typing') {
          setIsTyping(message.isTyping || false);
        } else if (message.type === 'error') {
          toast({
            title: "Error",
            description: message.content || "Something went wrong",
            variant: "destructive",
          });
        }

        // Notify all registered handlers
        messageHandlersRef.current.forEach(handler => handler(message));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setSocket(null);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [toast]);

  const sendMessage = useCallback((message: any) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
    }
  }, [socket]);

  const addMessageHandler = useCallback((handler: (message: WebSocketMessage) => void) => {
    messageHandlersRef.current.push(handler);
    return () => {
      messageHandlersRef.current = messageHandlersRef.current.filter(h => h !== handler);
    };
  }, []);

  return {
    isConnected,
    isTyping,
    sendMessage,
    addMessageHandler,
  };
}
