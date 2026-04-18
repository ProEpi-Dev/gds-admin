export interface SetupDto {
  managerName: string;
  managerEmail: string;
  managerPassword: string;
  managerEnrollment?: string;
  managerOrganizationLevel1?: string;
  managerOrganizationLevel2?: string;
  managerOrganizationLevel3?: string;
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
    enrollment?: string | null;
    organizationLevel1?: string | null;
    organizationLevel2?: string | null;
    organizationLevel3?: string | null;
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
