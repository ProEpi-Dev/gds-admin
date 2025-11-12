import type { FormVersion } from './form-version.types';

export interface FormWithVersion {
  formId: number;
  formTitle: string;
  version: FormVersion;
}

