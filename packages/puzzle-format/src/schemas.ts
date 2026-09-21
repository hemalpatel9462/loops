import appSettingsSchema from '../../../schemas/app-settings.schema.json';
import dailyPuzzleCatalogSchema from '../../../schemas/daily-puzzle-catalog.schema.json';
import dailyLoopStateSchema from '../../../schemas/daily-loop-state.schema.json';
import generatorConfigSchema from '../../../schemas/generator-config.schema.json';
import hintRecordSchema from '../../../schemas/hint-record.schema.json';
import playerProgressSchema from '../../../schemas/player-progress.schema.json';
import playerStatisticsSchema from '../../../schemas/player-statistics.schema.json';
import puzzleAttemptSchema from '../../../schemas/puzzle-attempt.schema.json';
import puzzleCatalogSchema from '../../../schemas/puzzle-catalog.schema.json';
import puzzleDefinitionSchema from '../../../schemas/puzzle-definition.schema.json';
import solverReportSchema from '../../../schemas/solver-report.schema.json';

export const approvedSchemas = {
  appSettings: appSettingsSchema,
  dailyPuzzleCatalog: dailyPuzzleCatalogSchema,
  dailyLoopState: dailyLoopStateSchema,
  generatorConfig: generatorConfigSchema,
  hintRecord: hintRecordSchema,
  playerProgress: playerProgressSchema,
  playerStatistics: playerStatisticsSchema,
  puzzleAttempt: puzzleAttemptSchema,
  puzzleCatalog: puzzleCatalogSchema,
  puzzleDefinition: puzzleDefinitionSchema,
  solverReport: solverReportSchema,
} as const;

export { puzzleDefinitionSchema };
