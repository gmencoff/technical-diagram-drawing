interface BaseOptions {
  required?: boolean;
  default?: unknown;
  shortDescription?: string;
  longDescription?: string;
}

interface NumericOptions extends BaseOptions {
  min?: number;
  max?: number;
}

interface StringOptions extends BaseOptions {
  allowedValues?: string[];
}

export class StringPropertyDefinition {
  type = 'string' as const;
  required?: boolean;
  default?: unknown;
  allowedValues?: string[];
  shortDescription?: string;
  longDescription?: string;

  constructor(opts: StringOptions) {
    this.required = opts.required;
    this.default = opts.default;
    this.allowedValues = opts.allowedValues;
    this.shortDescription = opts.shortDescription;
    this.longDescription = opts.longDescription;
  }

  validate(value: unknown, propertyName: string): void {
    if (typeof value !== 'string') {
      throw new Error(`${propertyName} must be a string`);
    }
    if (this.allowedValues && !this.allowedValues.includes(value)) {
      throw new Error(`${propertyName} must be one of: ${this.allowedValues.join(', ')}`);
    }
  }
}

export class NumberPropertyDefinition {
  type = 'number' as const;
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  shortDescription?: string;
  longDescription?: string;

  constructor(opts: NumericOptions) {
    this.required = opts.required;
    this.default = opts.default;
    this.min = opts.min;
    this.max = opts.max;
    this.shortDescription = opts.shortDescription;
    this.longDescription = opts.longDescription;
  }

  validate(value: unknown, propertyName: string): void {
    if (typeof value !== 'number') {
      throw new Error(`${propertyName} must be a number`);
    }
    if (this.min != null && value < this.min) {
      throw new Error(`${propertyName} must be >= ${this.min}`);
    }
    if (this.max != null && value > this.max) {
      throw new Error(`${propertyName} must be <= ${this.max}`);
    }
  }
}

export class IntegerPropertyDefinition {
  type = 'integer' as const;
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  shortDescription?: string;
  longDescription?: string;

  constructor(opts: NumericOptions) {
    this.required = opts.required;
    this.default = opts.default;
    this.min = opts.min;
    this.max = opts.max;
    this.shortDescription = opts.shortDescription;
    this.longDescription = opts.longDescription;
  }

  validate(value: unknown, propertyName: string): void {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      throw new Error(`${propertyName} must be an integer`);
    }
    if (this.min != null && value < this.min) {
      throw new Error(`${propertyName} must be >= ${this.min}`);
    }
    if (this.max != null && value > this.max) {
      throw new Error(`${propertyName} must be <= ${this.max}`);
    }
  }
}

export class ExpressionPropertyDefinition {
  type = 'expression' as const;
  required?: boolean;
  default?: unknown;
  shortDescription?: string;
  longDescription?: string;

  constructor(opts: BaseOptions) {
    this.required = opts.required;
    this.default = opts.default;
    this.shortDescription = opts.shortDescription;
    this.longDescription = opts.longDescription;
  }

  validate(value: unknown, propertyName: string): void {
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`${propertyName} must be a string expression or number`);
    }
  }
}

export class ArrayPropertyDefinition {
  type = 'array' as const;
  required?: boolean;
  default?: unknown;
  shortDescription?: string;
  longDescription?: string;

  constructor(opts: BaseOptions) {
    this.required = opts.required;
    this.default = opts.default;
    this.shortDescription = opts.shortDescription;
    this.longDescription = opts.longDescription;
  }

  validate(value: unknown, propertyName: string): void {
    if (!Array.isArray(value)) {
      throw new Error(`${propertyName} must be an array`);
    }
  }
}

export type PropertyDefinition =
  | StringPropertyDefinition
  | NumberPropertyDefinition
  | IntegerPropertyDefinition
  | ExpressionPropertyDefinition
  | ArrayPropertyDefinition;
