export const ROLE_PERMISSION_MODULES = [
  'Farm Profile',
  'Washing Station Connection',
  'Pickup Scheduling',
  'Payments',
  'Input and Service Requests',
  'Community Discussion',
  'Farmer Management',
  'Pickup Schedule',
  'Record Pickup',
  'Batch Creation',
  'Checkpoint & Transport Logging',
  'Supplier Assignment',
  'Incoming Batches',
  'Processing Queue',
  'Batch Transformation Tracking',
  'Inventory Management',
  'Quality Management',
  'Certification & Grading',
  'Defect Tracking',
  'Corrective Actions',
  'Lab & Buyer Requirements',
  'Batch Traceability',
  'Order Management',
  'Logistics & Shipping',
  'Transit Checkpoints',
  'Proof of Delivery',
  'Analytics & Reporting',
  'Help & Support',
  'System Configuration',
  'Security & Audit',
  'Database & Backup',
  'API Integrations',
  'Support Administration',
] as const;

export const OBSOLETE_ROLE_PERMISSION_MODULES = [
  'Authentication & Profile',
  'Profile',
  'Price Trends',
  'Training Resources',
  'Knowledge Base',
  'Maintenance',
  'Container Management',
  'Compliance Documentation',
  'Notifications',
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, { modules: string[] }> = {
  ADMIN: {
    modules: [
      'System Configuration',
      'Security & Audit',
      'Database & Backup',
      'API Integrations',
      'Support Administration',
      'Analytics & Reporting',
    ],
  },
  FARMER: {
    modules: [
      'Farm Profile',
      'Washing Station Connection',
      'Pickup Scheduling',
      'Payments',
      'Batch Traceability',
      'Input and Service Requests',
      'Community Discussion',
      'Analytics & Reporting',
    ],
  },
  AGGREGATOR: {
    modules: [
      'Farmer Management',
      'Pickup Schedule',
      'Record Pickup',
      'Batch Creation',
      'Batch Traceability',
      'Checkpoint & Transport Logging',
      'Analytics & Reporting',
      'Help & Support',
    ],
  },
  PROCESSOR: {
    modules: [
      'Supplier Assignment',
      'Incoming Batches',
      'Processing Queue',
      'Batch Transformation Tracking',
      'Corrective Actions',
      'Inventory Management',
      'Batch Traceability',
      'Analytics & Reporting',
      'Help & Support',
    ],
  },
  QUALITY_CONTROLLER: {
    modules: [
      'Quality Management',
      'Certification & Grading',
      'Defect Tracking',
      'Corrective Actions',
      'Lab & Buyer Requirements',
      'Batch Traceability',
      'Analytics & Reporting',
      'Help & Support',
    ],
  },
  LOGISTICS: {
    modules: [
      'Logistics & Shipping',
      'Transit Checkpoints',
      'Proof of Delivery',
      'Analytics & Reporting',
      'Help & Support',
    ],
  },
  EXPORTER: {
    modules: [
      'Order Management',
      'Batch Traceability',
      'Logistics & Shipping',
      'Analytics & Reporting',
      'Help & Support',
    ],
  },
};

export const ROLE_RELEVANT_PERMISSION_MODULES: Record<string, readonly string[]> = Object.fromEntries(
  Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([roleName, permissions]) => [roleName, permissions.modules])
);

export const permissionModuleList = (permissions: any): string[] => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions.filter((item): item is string => typeof item === 'string');
  if (Array.isArray(permissions.modules)) {
    return permissions.modules.filter((item: unknown): item is string => typeof item === 'string');
  }
  return Object.entries(permissions)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([moduleName]) => moduleName);
};

export const containsObsoletePermission = (permissions: any): boolean => {
  const modules = permissionModuleList(permissions);
  return modules.some(moduleName =>
    (OBSOLETE_ROLE_PERMISSION_MODULES as readonly string[]).includes(moduleName)
  );
};
