export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  scope: string | null;
  active: boolean;
}
