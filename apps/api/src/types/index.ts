import { FastifyRequest, FastifyReply } from 'fastify';

export type UserRole = 'player' | 'team_captain' | 'tournament_admin' | 'super_admin';

export interface JwtUserPayload {
  id: string;
  email: string;
  role: UserRole;
  banStatus: 'clean' | 'flagged' | 'banned';
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRoles: (roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}
