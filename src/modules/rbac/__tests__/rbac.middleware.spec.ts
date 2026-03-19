import { JwtService } from '@nestjs/jwt';
import { RbacMiddleware } from '../middleware/rbac.middleware';

describe('RbacMiddleware', () => {
  let middleware: RbacMiddleware;
  let mockJwtService: jest.Mocked<Partial<JwtService>>;

  function createMockRequest(options: { authHeader?: string } = {}): any {
    return {
      headers: {
        ...(options.authHeader ? { authorization: options.authHeader } : {}),
      },
      user: undefined,
    };
  }

  function createMockResponse(): any {
    return {};
  }

  beforeEach(() => {
    mockJwtService = {
      verify: jest.fn(),
    };

    middleware = new RbacMiddleware(mockJwtService as unknown as JwtService);
  });

  it('calls next() without setting user when no Authorization header is present', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
    expect(mockJwtService.verify).not.toHaveBeenCalled();
  });

  it('populates request.user with id, email, and roles from a valid JWT payload', () => {
    const payload = {
      sub: 'user-uuid-1',
      email: 'test@example.com',
      roles: ['admin', 'user'],
    };
    (mockJwtService.verify as jest.Mock).mockReturnValue(payload);

    const req = createMockRequest({ authHeader: 'Bearer valid.jwt.token' });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockJwtService.verify).toHaveBeenCalledWith('valid.jwt.token');
    expect(req.user).toEqual({
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('calls next() without throwing when JWT verification fails (invalid token)', () => {
    (mockJwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const req = createMockRequest({ authHeader: 'Bearer invalid.jwt.token' });
    const res = createMockResponse();
    const next = jest.fn();

    expect(() => middleware.use(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('does not set request.user when JWT verification fails', () => {
    (mockJwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const req = createMockRequest({ authHeader: 'Bearer expired.jwt.token' });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(req.user).toBeUndefined();
  });

  it('calls next() even when token is malformed', () => {
    (mockJwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const req = createMockRequest({ authHeader: 'Bearer not.a.valid.token.at.all' });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('extracts the token correctly from the Bearer authorization header', () => {
    const payload = { sub: 'user-1', email: 'u@test.com', roles: [] };
    (mockJwtService.verify as jest.Mock).mockReturnValue(payload);

    const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature';
    const req = createMockRequest({ authHeader: `Bearer ${token}` });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(mockJwtService.verify).toHaveBeenCalledWith(token);
  });

  it('does not set user when Authorization header exists but is not a Bearer token', () => {
    const req = createMockRequest({ authHeader: 'Basic dXNlcjpwYXNz' });
    const res = createMockResponse();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});
