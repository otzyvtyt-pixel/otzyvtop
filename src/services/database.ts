import type { DatabaseRepository } from './databaseTypes.ts';
import { FirebaseDatabaseRepository } from './firebaseRepository.ts';

export type {
  CreateCommentInput,
  CreateCompanyInput,
  CreateReviewInput,
  DatabaseRepository,
  ImportProgress,
  ModerationQueue,
  SearchCompaniesQuery,
} from './databaseTypes.ts';

export const database: DatabaseRepository = new FirebaseDatabaseRepository();
