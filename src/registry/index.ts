import { ObjectTypeHandler, HandlerLookup } from './object-type-handler.js';
import { antennaElementHandler } from './types/antenna-element.js';
import { annotationCircleHandler } from './types/annotation-circle.js';
import { rfBlockHandler } from './types/rf-block.js';
import { rfPhaseShifterHandler } from './types/rf-phase-shifter.js';
import { rfSeriesChainHandler } from './types/rf-series-chain.js';
import { rfParallelChainHandler } from './types/rf-parallel-chain.js';
import { layoutGroupHandler } from './types/layout-group.js';

export class ObjectRegistry implements HandlerLookup {
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
  registry.register(rfBlockHandler);
  registry.register(rfPhaseShifterHandler);
  registry.register(rfSeriesChainHandler);
  registry.register(rfParallelChainHandler);
  registry.register(layoutGroupHandler);
  return registry;
}
