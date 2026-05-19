import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { redis } from '../plugins/redis';

export interface WsMessage {
  type: string;
  payload: any;
  timestamp?: string;
}

interface ClientConnection {
  socket: WebSocket;
  userId?: string;
  role?: string;
  subscriptions: {
    matches: Set<string>;
    tournaments: Set<string>;
  };
}

export class WebSocketService {
  private static clients: Set<ClientConnection> = new Set();
  private static isSubscribed = false;
  private static CHANNEL = 'r6ac:ws:events';

  static async init(fastify: FastifyInstance) {
    if (!this.isSubscribed && fastify.redisSub) {
      try {
        await fastify.redisSub.subscribe(this.CHANNEL);
        fastify.redisSub.on('message', (channel: string, message: string) => {
          if (channel === this.CHANNEL) {
            try {
              const data: WsMessage & { targetMatchId?: string; targetTournamentId?: string } = JSON.parse(message);
              this.dispatchToLocalClients(data);
            } catch (err) {
              fastify.log.error({ err }, 'Failed to parse incoming Redis WS message');
            }
          }
        });
        this.isSubscribed = true;
      } catch (err) {
        fastify.log.warn('Redis pub/sub not available for WS broadcast');
      }
    }
  }

  static addClient(socket: WebSocket, userId?: string, role?: string) {
    const client: ClientConnection = {
      socket,
      userId,
      role,
      subscriptions: {
        matches: new Set(),
        tournaments: new Set(),
      },
    };

    this.clients.add(client);

    socket.on('message', (raw: Buffer) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());
        this.handleClientMessage(client, msg);
      } catch (err) {
        socket.send(JSON.stringify({ type: 'error', payload: 'Invalid JSON message' }));
      }
    });

    socket.on('close', () => {
      this.clients.delete(client);
    });
  }

  private static handleClientMessage(client: ClientConnection, msg: WsMessage) {
    switch (msg.type) {
      case 'match:subscribe':
        if (msg.payload?.matchId) client.subscriptions.matches.add(msg.payload.matchId);
        break;
      case 'match:unsubscribe':
        if (msg.payload?.matchId) client.subscriptions.matches.delete(msg.payload.matchId);
        break;
      case 'tournament:subscribe':
        if (msg.payload?.tournamentId) client.subscriptions.tournaments.add(msg.payload.tournamentId);
        break;
      case 'ping':
        client.socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        break;
      default:
        break;
    }
  }

  static async broadcast(message: WsMessage, targetMatchId?: string, targetTournamentId?: string) {
    const fullMessage = {
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
      targetMatchId,
      targetTournamentId,
    };

    if (redis && redis.status === 'ready') {
      await redis.publish(this.CHANNEL, JSON.stringify(fullMessage));
    } else {
      // Fallback for dev/standalone when Redis is offline
      this.dispatchToLocalClients(fullMessage);
    }
  }

  private static dispatchToLocalClients(data: WsMessage & { targetMatchId?: string; targetTournamentId?: string }) {
    const { targetMatchId, targetTournamentId, ...wsMsg } = data;
    const jsonStr = JSON.stringify(wsMsg);

    for (const client of this.clients) {
      if (client.socket.readyState !== 1) continue; // WebSocket.OPEN is 1

      if (targetMatchId && !client.subscriptions.matches.has(targetMatchId)) {
        continue;
      }
      if (targetTournamentId && !client.subscriptions.tournaments.has(targetTournamentId)) {
        continue;
      }

      client.socket.send(jsonStr);
    }
  }
}
