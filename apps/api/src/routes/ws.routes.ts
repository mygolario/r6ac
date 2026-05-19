import { FastifyPluginAsync } from 'fastify';
import { WebSocketService } from '../services/websocket.service';

const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', { websocket: true }, (connection, request) => {
    let userId: string | undefined;
    let role: string | undefined;

    // Attempt auth from request if available
    try {
      if (request.user) {
        userId = request.user.id;
        role = request.user.role;
      }
    } catch (err) {}

    WebSocketService.addClient(connection, userId, role);
  });
};

export default wsRoutes;
