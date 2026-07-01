import { ObjectTypeHandler } from './object-type-handler.js';
import { antennaElementHandler } from './types/antenna-element.js';
import { annotationCircleHandler } from './types/annotation-circle.js';

export class ObjectRegistry {
  private handlers = new Map<string, ObjectTypeHandler>();

  register(handler: ObjectTypeHandler): void {
    this.handlers.set(handler.typeName, handler);
  }

  lookup(typeName: string): ObjectTypeHandler | undefined {
    return this.handlers.get(typeName);
  }

  has(typeName: string): boolean {
    return this.handlers.has(typeName);
  }
}

export function createDefaultRegistry(): ObjectRegistry {
  const registry = new ObjectRegistry();
  registry.register(antennaElementHandler);
  registry.register(annotationCircleHandler);
  return registry;
}
