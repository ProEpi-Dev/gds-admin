export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: "/auth/login",
    CHANGE_PASSWORD: "/auth/change-password",
    SIGNUP: "/auth/signup",
  },

  // Setup
  SETUP: {
    CREATE: "/setup",
  },

  // Health
  HEALTH: {
    CHECK: "/health",
  },

  // Users
  USERS: {
    LIST: "/users",
    DETAIL: (id: number) => `/users/${id}`,
    CREATE: "/users",
    UPDATE: (id: number) => `/users/${id}`,
    DELETE: (id: number) => `/users/${id}`,
    ROLE: "/users/me/role",
    PROFILE_STATUS: "/users/me/profile-status",
    UPDATE_PROFILE: "/users/me/profile",
    LEGAL_ACCEPTANCE_STATUS: "/users/me/legal-acceptances/status",
    ACCEPT_LEGAL_DOCUMENTS: "/users/me/legal-acceptances",
  },

  // Locations
  LOCATIONS: {
    LIST: "/locations",
    DETAIL: (id: number) => `/locations/${id}`,
    CREATE: "/locations",
    UPDATE: (id: number) => `/locations/${id}`,
    DELETE: (id: number) => `/locations/${id}`,
  },

  // Contexts
  CONTEXTS: {
    LIST: "/contexts",
    DETAIL: (id: number) => `/contexts/${id}`,
    CREATE: "/contexts",
    UPDATE: (id: number) => `/contexts/${id}`,
    DELETE: (id: number) => `/contexts/${id}`,
  },

  // Context Managers
  CONTEXT_MANAGERS: {
    LIST: (contextId: number) => `/contexts/${contextId}/managers`,
    DETAIL: (contextId: number, id: number) =>
      `/contexts/${contextId}/managers/${id}`,
    CREATE: (contextId: number) => `/contexts/${contextId}/managers`,
    UPDATE: (contextId: number, id: number) =>
      `/contexts/${contextId}/managers/${id}`,
    DELETE: (contextId: number, id: number) =>
      `/contexts/${contextId}/managers/${id}`,
  },

  // Participations
  PARTICIPATIONS: {
    LIST: "/participations",
    DETAIL: (id: number) => `/participations/${id}`,
    CREATE: "/participations",
    UPDATE: (id: number) => `/participations/${id}`,
    DELETE: (id: number) => `/participations/${id}`,
  },

  // Forms
  FORMS: {
    LIST: "/forms",
    DETAIL: (id: number) => `/forms/${id}`,
    CREATE: "/forms",
    UPDATE: (id: number) => `/forms/${id}`,
    DELETE: (id: number) => `/forms/${id}`,
  },

  // Form Versions
  FORM_VERSIONS: {
    LIST: (formId: number) => `/forms/${formId}/versions`,
    DETAIL: (formId: number, id: number) => `/forms/${formId}/versions/${id}`,
    CREATE: (formId: number) => `/forms/${formId}/versions`,
    UPDATE: (formId: number, id: number) => `/forms/${formId}/versions/${id}`,
    DELETE: (formId: number, id: number) => `/forms/${formId}/versions/${id}`,
  },

  // Reports
  REPORTS: {
    LIST: "/reports",
    DETAIL: (id: number) => `/reports/${id}`,
    CREATE: "/reports",
    UPDATE: (id: number) => `/reports/${id}`,
    DELETE: (id: number) => `/reports/${id}`,
    POINTS: "/reports/points",
  },

  // CONTENTS
  CONTENT: {
    LIST: "/content",
    DETAIL: (id: number) => `/content/${id}`,
    CREATE: "/content",
    UPDATE: (id: number) => `/content/${id}`,
    DELETE: (id: number) => `/content/${id}`,
  },

  // TAGS
  TAGS: {
    LIST: "/tags",
    DETAIL: (id: number) => `/tags/${id}`,
    CREATE: "/tags",
    UPDATE: (id: number) => `/tags/${id}`,
    DELETE: (id: number) => `/tags/${id}`,
  },

  // Legal Documents
  LEGAL_DOCUMENTS: {
    ACTIVE: "/legal-documents/active",
    DETAIL: (id: number) => `/legal-documents/${id}`,
    BY_TYPE: (typeCode: string) => `/legal-documents/type/${typeCode}`,
    TYPES: "/legal-document-types",
  },

  // Legal Documents Admin
  LEGAL_DOCUMENTS_ADMIN: {
    LIST: "/admin/legal-documents",
    DETAIL: (id: number) => `/admin/legal-documents/${id}`,
    CREATE: "/admin/legal-documents",
    UPDATE: (id: number) => `/admin/legal-documents/${id}`,
    DELETE: (id: number) => `/admin/legal-documents/${id}`,
    TYPES_ALL: "/admin/legal-documents/types/all",
    TYPE_DETAIL: (id: number) => `/admin/legal-documents/types/${id}`,
    TYPE_CREATE: "/admin/legal-documents/types",
    TYPE_UPDATE: (id: number) => `/admin/legal-documents/types/${id}`,
    TYPE_DELETE: (id: number) => `/admin/legal-documents/types/${id}`,
  },

  // Genders
  GENDERS: {
    LIST: "/genders",
  },
};
