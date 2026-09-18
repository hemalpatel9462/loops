import { describe, expect, it } from 'vitest';
import { approvedSchemas, puzzleDefinitionSchema } from './schemas';

describe('approved JSON schema integration', () => {
  it('loads every checked-in schema as a Draft 2020-12 object schema', () => {
    for (const schema of Object.values(approvedSchemas)) {
      expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(typeof schema.$id).toBe('string');
      expect(schema.type).toBe('object');
      expect(schema.required).toBeInstanceOf(Array);
      expect(schema.properties).toBeDefined();
    }
  });

  it('keeps the puzzle definition required fields aligned with the shared contract', () => {
    expect(puzzleDefinitionSchema.required).toEqual(
      expect.arrayContaining([
        'schemaVersion',
        'id',
        'seed',
        'generatorVersion',
        'width',
        'height',
        'difficulty',
        'clues',
        'solutionEdges',
        'startingEdges',
        'metadata',
      ]),
    );
    expect(puzzleDefinitionSchema.$defs.edgeId.pattern).toBe('^[hv]:[0-9]+:[0-9]+$');
  });
});
