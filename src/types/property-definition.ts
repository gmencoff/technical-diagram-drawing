export interface PropertyDefinition {
  required?: boolean;
  default?: unknown;
  shortDescription?: string;
  longDescription?: string;
  validate(value: unknown, propertyName: string): void;
}
