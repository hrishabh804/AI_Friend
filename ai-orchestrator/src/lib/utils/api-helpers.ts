import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { logger } from './logger';

interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  timestamp: string;
}

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      error: null,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export function errorResponse(
  message: string,
  status: number = 500,
  details: any = null,
): NextResponse<ApiResponse<null>> {
  logger.error({ msg: message, details });
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: message,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export function validationErrorResponse(error: ZodError): NextResponse<ApiResponse<null>> {
  const simplifiedErrors = error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
  logger.warn({ msg: 'Validation error', errors: simplifiedErrors });
  return NextResponse.json(
    {
      success: false,
      data: null,
      error: 'Invalid input provided.',
      details: simplifiedErrors,
      timestamp: new Date().toISOString(),
    },
    { status: 400 },
  );
}

type ApiHandler<T> = (req: Request, params?: any) => Promise<NextResponse<ApiResponse<T>>>;

export function withErrorHandler<T>(handler: ApiHandler<T>): ApiHandler<T> {
  return async (req: Request, params?: any) => {
    try {
      return await handler(req, params);
    } catch (error) {
      if (error instanceof ZodError) {
        return validationErrorResponse(error) as any;
      }
      logger.error(error, 'Unhandled API error');
      return errorResponse('An unexpected error occurred on the server.', 500, error) as any;
    }
  };
}
