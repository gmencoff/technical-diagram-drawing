export type PropertyType = 'string' | 'number' | 'expression' | 'array' | 'object';

export interface PropertyDefinition {
  type?: PropertyType;
  required?: boolean;
  default?: unknown;
  shortDescription?: string;
  longDescription?: string;
  validate(value: unknown, propertyName: string): void;
}
