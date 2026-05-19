import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth-store';

const WS_URL = 'ws://localhost:4000/ws';

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function initWsClient(queryClient: QueryClient) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const { accessToken } = useAuthStore.getState();
  const url = accessToken ? `${WS_URL}?token=${accessToken}` : WS_URL;

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsEvent(msg, queryClient);
      } catch (err) {}
    };

    ws.onclose = () => {
      ws = null;
      reconnectTimer = setTimeout(() => initWsClient(queryClient), 3000);
    };

    ws.onerror = () => {
      if (ws) ws.close();
    };
  } catch (err) {}
}

function handleWsEvent(msg: { type: string; payload: any; timestamp?: string }, queryClient: QueryClient) {
  switch (msg.type) {
    case 'report:new':
    case 'report:reviewed':
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      break;

    case 'match:updated':
    case 'match:kick_player':
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      break;

    case 'player:ban_status_changed':
      queryClient.invalidateQueries({ queryKey: ['players'] });
      break;

    case 'tournament:status_changed':
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      break;

    default:
      break;
  }
}

export function wsSubscribeMatch(matchId: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'match:subscribe', payload: { matchId } }));
  }
}

export function wsUnsubscribeMatch(matchId: string) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'match:unsubscribe', payload: { matchId } }));
  }
}
