import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export type AuthUser = { id: string };
export type AuthRequest = Request & { user?: AuthUser };

function extractToken(request: Request): string | null {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  return type === 'Bearer' && token ? token : null;
}

async function authenticate(
  jwtService: JwtService,
  request: AuthRequest,
  token: string,
) {
  try {
    const payload = await jwtService.verifyAsync<{ sub: string }>(token);
    request.user = { id: payload.sub };
  } catch {
    throw new UnauthorizedException('Сессия истекла, войдите снова!');
  }
}

/** Пускает только с действующим токеном. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Войдите, чтобы продолжить!');
    }
    await authenticate(this.jwtService, request, token);
    return true;
  }
}

/** Пускает и гостей; если токен передан, он должен быть действующим. */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = extractToken(request);
    if (token) await authenticate(this.jwtService, request, token);
    return true;
  }
}
