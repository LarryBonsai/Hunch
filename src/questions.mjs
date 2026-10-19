// The game's cards are read from the private SQLite catalogue.
import { getCatalog } from './catalog.mjs';
export const QUESTIONS = getCatalog().getCards();
