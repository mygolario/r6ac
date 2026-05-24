import { FastifyPluginAsync } from 'fastify';
import { WebSocketService } from '../services/websocket.service';

const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { websocket: true }, async (connection, request) => {
    let userId: string | undefined;
    let role: string | undefined;

    try {
      // Allow token from query param ?token=... or Auth header
      const token = (request.query as any)?.token || request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        connection.socket.close(1008, 'Unauthorized: Token missing');
        return;
      }

      const decoded = fastify.jwt.verify<{ id: string; role: string; hwid?: string }>(token);
      userId = decoded.id;
      role = decoded.role;
      
      // If agent is connecting, verify HWID is linked to the token
      // Note: we trust the token here because the agent/auth endpoint already verified hwid during login.
    } catch (err) {
      connection.socket.close(1008, 'Unauthorized: Invalid token');
      return;
    }

    WebSocketService.addClient(connection, userId, role);
  });
};

export default wsRoutes;
