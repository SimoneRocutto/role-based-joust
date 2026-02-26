import type { Request, Response, NextFunction } from "express";
import type { GameEngine } from "@/managers/GameEngine";
import { ApiError } from "./errorHandler";

/**
 * Validation schemas for common request types
 */
const schemas = {
  /**
   * Movement data validation
   */
  movementData: {
    x: { type: "number", required: true, min: -20, max: 20 },
    y: { type: "number", required: true, min: -20, max: 20 },
    z: { type: "number", required: true, min: -20, max: 20 },
    timestamp: { type: "number", required: false },
    deviceType: {
      type: "string",
      required: false,
      enum: ["phone", "joycon", "custom"],
    },
  },

  /**
   * Player join data validation
   */
  playerJoin: {
    name: { type: "string", required: true, minLength: 1, maxLength: 50 },
    socketId: { type: "string", required: false },
  },

  /**
   * Game creation data validation
   */
  gameCreate: {
    mode: { type: "string", required: true },
    theme: { type: "string", required: false },
    playerCount: { type: "number", required: false, min: 2, max: 20 },
  },

  /**
   * Reconnection data validation
   */
  reconnect: {
    token: { type: "string", required: true, minLength: 10 },
  },

  /**
   * Game settings (sensitivity, mode, theme, roundCount) validation
   */
  gameSettings: {
    sensitivity: { type: "string", required: false },
    gameMode: { type: "string", required: false },
    theme: { type: "string", required: false },
    roundCount: { type: "number", required: false, min: 1, max: 10 },
    teamsEnabled: { type: "boolean", required: false },
    teamCount: { type: "number", required: false, min: 2, max: 4 },
    dangerThreshold: { type: "number", required: false, min: 0.001, max: 1 },
    damageMultiplier: { type: "number", required: false, min: 1, max: 500 },
    dominationPointTarget: { type: "number", required: false, min: 5, max: 100 },
    dominationControlInterval: { type: "number", required: false, min: 3, max: 15 },
    dominationRespawnTime: { type: "number", required: false, min: 5, max: 30 },
    dominationBaseCount: { type: "number", required: false, min: 1, max: 3 },
    deathCountRespawnTime: { type: "number", required: false, min: 3, max: 30 },
    withEarbud: { type: "boolean", required: false },
    targetScore: { type: "number", required: false, min: 5, max: 50 },
  },
};

type SchemaKey = keyof typeof schemas;
type Schema = Record<string, any>;

/**
 * Validate a value against a field schema
 */
function validateField(
  value: any,
  fieldName: string,
  fieldSchema: any
): string | null {
  // Check required
  if (fieldSchema.required && (value === undefined || value === null)) {
    return `${fieldName} is required`;
  }

  // If not required and not provided, skip validation
  if (!fieldSchema.required && (value === undefined || value === null)) {
    return null;
  }

  // Type validation
  const actualType = typeof value;
  if (actualType !== fieldSchema.type) {
    return `${fieldName} must be a ${fieldSchema.type}, got ${actualType}`;
  }

  // Number validations
  if (fieldSchema.type === "number") {
    if (!isFinite(value)) {
      return `${fieldName} must be a finite number`;
    }

    if (fieldSchema.min !== undefined && value < fieldSchema.min) {
      return `${fieldName} must be at least ${fieldSchema.min}`;
    }

    if (fieldSchema.max !== undefined && value > fieldSchema.max) {
      return `${fieldName} must be at most ${fieldSchema.max}`;
    }
  }

  // String validations
  if (fieldSchema.type === "string") {
    if (
      fieldSchema.minLength !== undefined &&
      value.length < fieldSchema.minLength
    ) {
      return `${fieldName} must be at least ${fieldSchema.minLength} characters`;
    }

    if (
      fieldSchema.maxLength !== undefined &&
      value.length > fieldSchema.maxLength
    ) {
      return `${fieldName} must be at most ${fieldSchema.maxLength} characters`;
    }

    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      return `${fieldName} must be one of: ${fieldSchema.enum.join(", ")}`;
    }
  }

  return null;
}

/**
 * Validate request body against a schema
 */
function validateBody(body: any, schema: Schema): string[] {
  const errors: string[] = [];

  // Check each field in schema
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const error = validateField(body[fieldName], fieldName, fieldSchema);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Create a validation middleware for a specific schema
 */
export function validate(schemaName: SchemaKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const schema = schemas[schemaName];

    if (!schema) {
      throw new Error(`Unknown validation schema: ${schemaName}`);
    }

    const errors = validateBody(req.body, schema);

    if (errors.length > 0) {
      throw new ApiError(`Validation failed: ${errors.join("; ")}`, 400);
    }

    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors = validateBody(req.query, schema);

    if (errors.length > 0) {
      throw new ApiError(`Query validation failed: ${errors.join("; ")}`, 400);
    }

    next();
  };
}

/**
 * Validate player ID in request
 */
export function validatePlayerId(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const playerId = req.params.playerId || req.body.playerId;

  if (!playerId || typeof playerId !== "string" || playerId.length === 0) {
    throw new ApiError("Invalid or missing player ID", 400);
  }

  next();
}

/**
 * Validate game is active
 */
export function validateGameActive(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const gameEngine: GameEngine = req.app.locals.gameEngine;

  if (!gameEngine.isActive()) {
    throw new ApiError("Game is not active", 400);
  }

  next();
}

/**
 * Custom validator function
 */
export function customValidate(
  validator: (req: Request) => { valid: boolean; error?: string }
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validator(req);

    if (!result.valid) {
      throw new ApiError(result.error || "Validation failed", 400);
    }

    next();
  };
}
