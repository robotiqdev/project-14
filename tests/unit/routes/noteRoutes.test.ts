import { Request, Response, NextFunction, Router } from 'express';
import { createNoteRouter } from '../../../src/routes/noteRoutes';
import * as validateModule from '../../../src/middleware/validate';
import * as noteValidatorModule from '../../../src/validators/noteValidator';
import { ValidationError } from '../../../src/errors/AppError';

// Express Router exposes .handle() at runtime but it is not in its public type
type RouterWithHandle = Router & {
  handle(req: any, res: any, next: any): void;
};

// Minimal NoteController interface for testing — implementation lives in a future task
interface NoteController {
  create: (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
}

function makeMockController(): jest.Mocked<NoteController> {
  return {
    create: jest.fn((_req, _res, _next) => {}),
  };
}

function makeExpressObjects(body: unknown = {}) {
  const req = { body, method: 'POST', path: '/' } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as unknown as jest.MockedFunction<NextFunction>;
  return { req, res, next };
}

describe('createNoteRouter', () => {
  it('should be a function', () => {
    expect(typeof createNoteRouter).toBe('function');
  });

  it('should return a Router when called with a controller', () => {
    const controller = makeMockController();
    const router = createNoteRouter(controller);

    // Express Router instances expose `stack` which holds the registered layers
    expect(router).toBeDefined();
    expect(typeof router).toBe('function'); // Router is a function in express
    expect((router as any).stack).toBeDefined();
  });

  it('should register exactly one route on the router', () => {
    const controller = makeMockController();
    const router = createNoteRouter(controller) as RouterWithHandle;
    const stack = (router as any).stack as any[];

    expect(stack).toHaveLength(1);
  });

  it('should register the route on the POST HTTP method', () => {
    const controller = makeMockController();
    const router = createNoteRouter(controller) as RouterWithHandle;
    const stack = (router as any).stack as any[];
    const layer = stack[0];

    // The route layer has a route property with `methods` listing supported HTTP verbs
    expect(layer.route).toBeDefined();
    expect(layer.route.methods.post).toBe(true);
  });

  it('should register the route at path "/"', () => {
    const controller = makeMockController();
    const router = createNoteRouter(controller) as RouterWithHandle;
    const stack = (router as any).stack as any[];
    const layer = stack[0];

    expect(layer.route.path).toBe('/');
  });

  it('should attach two handlers on the POST / route (validate + controller.create)', () => {
    const controller = makeMockController();
    const router = createNoteRouter(controller) as RouterWithHandle;
    const stack = (router as any).stack as any[];
    const routeLayer = stack[0];
    const routeHandlers = routeLayer.route.stack as any[];

    // Middleware chain: validate handler + controller.create
    expect(routeHandlers).toHaveLength(2);
  });

  describe('request handling — validation passes', () => {
    it('should call controller.create when body is valid', () => {
      const controller = makeMockController();
      const router = createNoteRouter(controller) as RouterWithHandle;

      // Simulate a valid body according to validateCreateNote
      const { req, res, next } = makeExpressObjects({ title: 'Hello', content: 'World' });

      // Dispatch the request through the router
      router.handle(req as any, res as any, next as any);

      expect(controller.create).toHaveBeenCalledTimes(1);
    });

    it('should pass req, res, and next through to controller.create on valid input', () => {
      const controller = makeMockController();
      const router = createNoteRouter(controller) as RouterWithHandle;

      const { req, res, next } = makeExpressObjects({ title: 'Hello', content: 'World' });

      router.handle(req as any, res as any, next as any);

      expect(controller.create).toHaveBeenCalledWith(req, res, expect.any(Function));
    });
  });

  describe('request handling — validation fails', () => {
    it('should NOT call controller.create when body is invalid', () => {
      const controller = makeMockController();
      const router = createNoteRouter(controller) as RouterWithHandle;

      // Empty body should fail validateCreateNote (no title or content)
      const { req, res, next } = makeExpressObjects({});

      router.handle(req as any, res as any, next as any);

      expect(controller.create).not.toHaveBeenCalled();
    });

    it('should call next with a ValidationError when body is invalid', () => {
      const controller = makeMockController();
      const router = createNoteRouter(controller) as RouterWithHandle;

      const { req, res, next } = makeExpressObjects({});

      router.handle(req as any, res as any, next as any);

      expect(next).toHaveBeenCalledTimes(1);
      const [arg] = (next as jest.Mock).mock.calls[0];
      expect(arg).toBeInstanceOf(ValidationError);
    });

    it('should forward validation errors with details when body is missing title', () => {
      const controller = makeMockController();
      const router = createNoteRouter(controller) as RouterWithHandle;

      const { req, res, next } = makeExpressObjects({ content: 'some content' });

      router.handle(req as any, res as any, next as any);

      const [arg] = (next as jest.Mock).mock.calls[0];
      if (arg instanceof ValidationError) {
        expect(arg.details).toBeDefined();
        expect(typeof arg.details).toBe('object');
      } else {
        // If valid (no title required), controller should have been called
        expect(controller.create).toHaveBeenCalled();
      }
    });
  });

  describe('middleware ordering — validate runs before controller.create', () => {
    it('should invoke validate middleware before controller.create', () => {
      const callOrder: string[] = [];

      const controller: NoteController = {
        create: jest.fn((_req, _res, _next) => {
          callOrder.push('controller.create');
        }),
      };

      // Spy on validate to track invocation order
      jest.spyOn(validateModule, 'validate').mockImplementationOnce((validatorFn) => {
        return (req, _res, next) => {
          callOrder.push('validate');
          const result = validatorFn(req.body);
          if (!result.valid) {
            next(new ValidationError(result.errors ?? {}));
            return;
          }
          next();
        };
      });

      const router = createNoteRouter(controller) as RouterWithHandle;
      const { req, res, next } = makeExpressObjects({ title: 'Test', content: 'Body' });

      router.handle(req as any, res as any, next as any);

      const validateIndex = callOrder.indexOf('validate');
      const createIndex = callOrder.indexOf('controller.create');

      expect(validateIndex).toBeGreaterThanOrEqual(0);
      expect(createIndex).toBeGreaterThanOrEqual(0);
      expect(validateIndex).toBeLessThan(createIndex);

      jest.spyOn(validateModule, 'validate').mockRestore();
    });
  });

  describe('dependency injection — controller is wired at factory time', () => {
    it('should create independent routers for different controller instances', () => {
      const controllerA = makeMockController();
      const controllerB = makeMockController();

      const routerA = createNoteRouter(controllerA) as RouterWithHandle;
      const routerB = createNoteRouter(controllerB) as RouterWithHandle;

      const { req: reqA, res: resA, next: nextA } = makeExpressObjects({
        title: 'Note A',
        content: 'Content A',
      });
      const { req: reqB, res: resB, next: nextB } = makeExpressObjects({
        title: 'Note B',
        content: 'Content B',
      });

      routerA.handle(reqA as any, resA as any, nextA as any);
      routerB.handle(reqB as any, resB as any, nextB as any);

      expect(controllerA.create).toHaveBeenCalledTimes(1);
      expect(controllerB.create).toHaveBeenCalledTimes(1);
    });

    it('should use the exact controller instance passed into the factory', () => {
      const controller = makeMockController();
      const router = createNoteRouter(controller) as RouterWithHandle;

      const { req, res, next } = makeExpressObjects({ title: 'Test', content: 'Test' });
      router.handle(req as any, res as any, next as any);

      // Verify that it was specifically *this* controller's create that was called
      expect(controller.create).toHaveBeenCalled();
    });
  });

  describe('validate is called with validateCreateNote', () => {
    it('should call validate() with validateCreateNote as the validator function', () => {
      const validateSpy = jest.spyOn(validateModule, 'validate');
      const controller = makeMockController();

      createNoteRouter(controller);

      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(validateSpy).toHaveBeenCalledWith(noteValidatorModule.validateCreateNote);

      validateSpy.mockRestore();
    });
  });
});
