import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { authGuard } from './auth.guard.js';
import { env } from '../../infra/config/env.js';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../infra/config/env.js', () => ({
  env: {
    nodeEnv: 'test',
    jwt: {
      secret: 'test-jwt-secret'
    }
  }
}));

const mockJwt = jwt as any;
const mockEnv = env as any;

describe('Auth Guard Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReq = {
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();

    // Reset env to test default
    mockEnv.nodeEnv = 'test';
    mockEnv.jwt.secret = 'test-jwt-secret';
  });

  describe('missing or invalid authorization header', () => {
    it('should return 401 when authorization header is missing', () => {
      mockReq.headers = {};

      authGuard(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'missing bearer token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', () => {
      mockReq.headers.authorization = 'Basic token123';

      authGuard(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'missing bearer token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when Bearer token is empty', () => {
      mockReq.headers.authorization = 'Bearer ';

      authGuard(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'missing bearer token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('development environment special tokens', () => {
    beforeEach(() => {
      mockEnv.nodeEnv = 'development';
    });

    it('should allow test-token-123 in development environment', () => {
      mockReq.headers.authorization = 'Bearer test-token-123';

      authGuard(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should allow tokens starting with dev- in development environment', () => {
      mockReq.headers.authorization = 'Bearer dev-test-token';

      authGuard(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should not allow dev- tokens in non-development environment', () => {
      mockEnv.nodeEnv = 'production';
      mockReq.headers.authorization = 'Bearer dev-test-token';
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'invalid token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not allow test-token-123 in non-development environment', () => {
      mockEnv.nodeEnv = 'production';
      mockReq.headers.authorization = 'Bearer test-token-123';
      mockJwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'invalid token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('JWT token verification', () => {
    it('should call next() when JWT token is valid', () => {
      mockReq.headers.authorization = 'Bearer valid.jwt.token';
      mockJwt.verify.mockReturnValue({ userId: '123' });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', 'test-jwt-secret');
      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return 401 when JWT verification throws error', () => {
      mockReq.headers.authorization = 'Bearer invalid.jwt.token';
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('invalid.jwt.token', 'test-jwt-secret');
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'invalid token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle jwt.verify throwing non-Error', () => {
      mockReq.headers.authorization = 'Bearer invalid.jwt.token';
      mockJwt.verify.mockImplementation(() => {
        throw 'Some string error';
      });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        data: null,
        error: {
          code: 'UNAUTHORIZED',
          message: 'invalid token'
        }
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('environment-specific behavior', () => {
    it('should use production JWT secret in production environment', () => {
      mockEnv.nodeEnv = 'production';
      mockEnv.jwt.secret = 'prod-secret';
      mockReq.headers.authorization = 'Bearer valid.jwt.token';
      mockJwt.verify.mockReturnValue({ userId: '123' });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', 'prod-secret');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should use development JWT secret in development environment', () => {
      mockEnv.nodeEnv = 'development';
      mockEnv.jwt.secret = 'dev-secret';
      mockReq.headers.authorization = 'Bearer valid.jwt.token';
      mockJwt.verify.mockReturnValue({ userId: '123' });

      authGuard(mockReq, mockRes, mockNext);

      expect(mockJwt.verify).toHaveBeenCalledWith('valid.jwt.token', 'dev-secret');
      expect(mockNext).toHaveBeenCalled();
    });
  });
});