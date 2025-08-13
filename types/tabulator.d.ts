import { Tabulator } from 'tabulator-tables';

declare global {
  interface Window {
    Tabulator: typeof Tabulator;
  }
}

export {};
