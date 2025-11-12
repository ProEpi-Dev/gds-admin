export interface SetupDto {
  managerName: string;
  managerEmail: string;
  managerPassword: string;
  contextName?: string;
  contextDescription?: string;
}

export interface SetupResponse {
  message: string;
  context: {
    id: number;
    name: string;
    description: string;
    accessType: string;
    active: boolean;
  };
  manager: {
    id: number;
    name: string;
    email: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  contextManager: {
    id: number;
    userId: number;
    contextId: number;
    active: boolean;
  };
}

