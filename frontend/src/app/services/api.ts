const API_BASE_URL = '/api';

class ApiService {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      cache: 'no-store',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }

    return response.json();
  }

  // ==================== AUTH ====================
  async login(email: string, password: string) {
    return this.request<{
      message: string;
      token: string;
      user: { userId: string; fullName: string; email: string; phone?: string; role: string; mfaEnabled: boolean; status?: string };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: Record<string, any>) {
    return this.request<{
      success: boolean;
      message: string;
      data: any;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(data: { email: string; token: string; newPassword: string }) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCustomerOrder(data: Record<string, any>) {
    return this.request<{ success: boolean; message: string; data: any }>('/customer/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCustomerCoffeeVarieties() {
    return this.request<{ success: boolean; data: string[] }>('/customer/coffee-varieties');
  }

  async getCustomerCoffeeGrades() {
    return this.request<{ success: boolean; data: Array<{ value: string; label: string; detail: string }> }>('/customer/coffee-grades');
  }

  async getCustomerOrder(referenceCode: string, email: string) {
    return this.request<{ success: boolean; data: any }>(
      `/customer/orders/${encodeURIComponent(referenceCode)}?email=${encodeURIComponent(email)}`
    );
  }

  async createCustomerOrderMessage(referenceCode: string, data: { email: string; senderName?: string; message: string }) {
    return this.request<{ success: boolean; data: any }>(`/customer/orders/${encodeURIComponent(referenceCode)}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async searchCooperatives(query = '') {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/auth/cooperatives${params}`);
  }

  async getPublicWashingStations() {
    return this.request<{ success: boolean; data: any[] }>('/auth/washing-stations');
  }

  async getRoleReportTemplates() {
    return this.request<{ success: boolean; data: any[] }>('/reports/templates');
  }

  async generateRoleReport(data: { templateId: string; filters?: Record<string, any> }) {
    return this.request<{ success: boolean; data: { template: any; rows: any[]; summary: any; csv: string; generatedAt: string } }>('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFarmerWashingStationRequests() {
    return this.request<{ success: boolean; data: any }>('/farmers/washing-station-requests');
  }

  async createFarmerWashingStationRequest(data: { washingStationName: string; reason?: string }) {
    return this.request<{ success: boolean; data: any }>('/farmers/washing-station-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyMfa(email: string, otp: string) {
    return this.request<{
      message: string;
      token: string;
      user: {
        userId: string;
        fullName?: string;
        email: string;
        phone?: string;
        role: string;
        permissions?: any;
        mfaEnabled: boolean;
        status: string;
      };
    }>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async resendMfaCode(email: string) {
    return this.request<{ message: string }>('/auth/mfa/resend', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async getCurrentUser() {
    return this.request<{ success: boolean; data: any }>('/auth/me', { cache: 'no-store' });
  }

  async updateCurrentUser(data: { fullName: string; email: string; phone?: string }) {
    return this.request<{ success: boolean; data: any }>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateCurrentUserMfa(mfaEnabled: boolean) {
    return this.request<{ success: boolean; message: string; data: any }>('/auth/me/mfa', {
      method: 'PATCH',
      body: JSON.stringify({ mfaEnabled }),
    });
  }

  async getMyAccessRequests() {
    return this.request<{ success: boolean; data: any[] }>('/auth/me/access-requests');
  }

  async createAccessRequest(data: { requestedModule: string; reason: string; sensitivity?: string }) {
    return this.request<{ success: boolean; data: any }>('/auth/me/access-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== FARMER ====================
  async getFarmerDashboard() {
    return this.request<{ success: boolean; data: any }>('/farmers/dashboard');
  }

  async getFarmerEudrStatus() {
    return this.request<{ success: boolean; data: any }>('/farmers/eudr-status');
  }

  async updateFarmerProfile(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/farmers/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getCooperativeMemberFarms() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/cooperative-farms');
  }

  async createCooperativeMemberFarm(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/farmers/cooperative-farms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFarmerPickups() {
    return this.request<{ success: boolean; data: any[] }>(`/farmers/pickups?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  async getFarmerPaymentReceipts() {
    return this.request<{ success: boolean; data: any[] }>(`/farmers/payment-receipts?ts=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
  }

  async getFarmerPickupRequests() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/pickup-requests');
  }

  async createPickupRequest(data: { weightEstimate: number; notes?: string; requestedDate?: string; farmCoordinates?: string; farmLocation?: string; coffeeVariety?: string }) {
    return this.request<{ success: boolean; data: any }>('/farmers/pickup-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getFarmerTraceability() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/traceability');
  }

  async getFarmerPriceTrends() {
    return this.request<{ success: boolean; data: any }>('/farmers/price-trends', { cache: 'no-store' });
  }

  async getMarketPrices() {
    return this.request<{ success: boolean; data: any }>('/market-prices', { cache: 'no-store' });
  }

  async getCommunityTopics() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/community');
  }

  async createCommunityPost(data: { groupId?: string; content: string; imageUrl?: string }) {
    return this.request<{ success: boolean; data: any }>('/farmers/community', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCommunityReply(postId: string, data: { content: string }) {
    return this.request<{ success: boolean; data: any }>(`/farmers/community/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async toggleCommunityLike(postId: string) {
    return this.request<{ success: boolean; liked: boolean }>(`/farmers/community/${postId}/like`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getKnowledgeArticles() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/knowledge');
  }

  async getFarmerServiceRequests() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/service-requests');
  }

  async createFarmerServiceRequest(data: { requestType: string; description: string; quantity?: string; preferredDate?: string }) {
    return this.request<{ success: boolean; data: any }>('/farmers/service-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSupportTickets() {
    return this.request<{ success: boolean; data: any[] }>('/farmers/support-tickets');
  }

  async createSupportTicket(data: { subject: string; category: string; description: string }) {
    return this.request<{ success: boolean; data: any }>('/farmers/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== PAYMENTS (MOBILE MONEY) ====================
  async checkPaymentStatus(data: { provider: string; phoneNumber: string; amount: number }) {
    return this.request<{ success: boolean; status: string; transactionId?: string; message?: string }>('/payments/status', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== AGGREGATOR ====================
  async getAggregatorDashboard() {
    return this.request<{ success: boolean; data: any }>('/aggregators/dashboard');
  }

  async recordPickup(data: {
    farmerId: string;
    weightKg: number;
    pricePerKg: number;
    paymentMethod?: string;
    isPaid?: boolean;
  }) {
    return this.request<{ success: boolean; data: any }>('/aggregators/pickups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markPickupPaymentPaid(deliveryId: string) {
    return this.request<{ success: boolean; data: any }>(`/aggregators/pickups/${deliveryId}/payment/paid`, {
      method: 'PATCH',
    });
  }

  async getPickupCurrentWashingStation(deliveryId: string) {
    return this.request<{ success: boolean; data: any }>(`/aggregators/pickups/${deliveryId}/washing-station`);
  }

  async createBatch(data: {
    deliveryIds: string[];
    district: string;
    washingStation: string;
    farmName?: string;
    checkpointLocation?: string;
    transportMethod?: string;
    transporterName?: string;
    departureTime?: string;
    condition?: string;
    splitWeights?: number[];
    rfidTag?: string;
    certificationStatus?: Record<string, any>;
  }) {
    return this.request<{ success: boolean; data: any }>('/aggregators/batches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAggregatorProfile() {
    return this.request<{ success: boolean; data: any }>('/aggregators/profile');
  }

  async updateAggregatorProfile(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/aggregators/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async registerAggregatorFarmer(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/aggregators/farmers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createCheckpointLog(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/aggregators/checkpoints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTransportLog(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/aggregators/transport-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAggregatorSupportTickets() {
    return this.request<{ success: boolean; data: any[] }>('/aggregators/support-tickets');
  }

  async createAggregatorSupportTicket(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/aggregators/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPickupRequests(status?: string) {
    const params = status ? `?status=${status}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/aggregators/pickup-requests${params}`);
  }

  async updatePickupRequest(requestId: string, data: { status: string; pickupDate?: string }) {
    return this.request<{ success: boolean; data: any }>(`/aggregators/pickup-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async completePickupRequest(requestId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/aggregators/pickup-requests/${requestId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== PROCESSOR ====================
  async getProcessorDashboard() {
    return this.request<{ success: boolean; data: any }>('/processors/dashboard');
  }

  async getProcessorSupplierAssignments() {
    return this.request<{ success: boolean; data: { suppliers: any[]; aggregators: any[]; stations: string[] } }>('/processors/supplier-assignments');
  }

  async assignProcessorSupplier(profileId: string, data: { aggregatorId: string; status?: string }) {
    return this.request<{ success: boolean; data: any }>(`/processors/supplier-assignments/${profileId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getProcessorBatches() {
    return this.request<{ success: boolean; data: any[] }>('/processors/batches');
  }

  async updateBatchStatus(batchId: string, status: string, details: Record<string, any> = {}) {
    return this.request<{ success: boolean; data: any }>(`/processors/batches/${batchId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...details }),
    });
  }

  async completeProcessing(batchId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/processors/batches/${batchId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logProcessingStep(batchId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/processors/batches/${batchId}/logs`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProcessorInventory() {
    return this.request<{ success: boolean; data: any[]; movements?: any[] }>('/processors/inventory');
  }

  async updateInventoryItem(itemId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/processors/inventory/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async reconcileInventoryItem(itemId: string, data: { physicalQuantityKg: number; notes?: string }) {
    return this.request<{ success: boolean; data: any }>(`/processors/inventory/${itemId}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProcessorSupportTickets() {
    return this.request<{ success: boolean; data: any[] }>('/processors/support-tickets');
  }

  async createProcessorSupportTicket(data: { subject: string; category: string; description: string }) {
    return this.request<{ success: boolean; data: any }>('/processors/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProcessorCorrectiveActions() {
    return this.request<{ success: boolean; data: any[] }>('/processors/corrective-actions');
  }

  async submitProcessorCorrectiveAction(actionId: string, data: { submittedNotes: string; evidence?: any[] }) {
    return this.request<{ success: boolean; data: any }>(`/processors/corrective-actions/${actionId}/submit`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== QUALITY CONTROL ====================
  async getQCDashboard() {
    return this.request<{ success: boolean; data: any }>('/qc/dashboard');
  }

  async getPendingAssessments() {
    return this.request<{ success: boolean; data: any[] }>('/qc/assessments/pending');
  }

  async getQCHistory() {
    return this.request<{ success: boolean; data: any[] }>('/qc/assessments/history');
  }

  async submitQualityAssessment(batchId: string, data: {
    cuppingScore: number;
    moisture: number;
    defects: any;
    notes: string;
    density?: number;
    screenSize?: number;
    scaScores?: Record<string, number>;
    evidence?: any;
    correctiveAction?: string;
  }) {
    return this.request<{ success: boolean; data: any }>(`/qc/assessments/${batchId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getQCSupportTickets() {
    return this.request<{ success: boolean; data: any[] }>('/qc/support-tickets');
  }

  async createQCSupportTicket(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/qc/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCorrectiveActions() {
    return this.request<{ success: boolean; data: any[] }>('/qc/corrective-actions');
  }

  async reviewCorrectiveAction(actionId: string, data: { decision: 'resolved' | 'rejected'; reviewNotes?: string }) {
    return this.request<{ success: boolean; data: any }>(`/qc/corrective-actions/${actionId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async generateQualityCertificate(assessmentId: string) {
    return this.request<{ success: boolean; data: any }>(`/qc/certificates/${assessmentId}`, {
      method: 'POST',
    });
  }

  async getLabSyncRecords() {
    return this.request<{ success: boolean; data: any[] }>('/qc/lab-sync');
  }

  async createLabSyncRecord(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/qc/lab-sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBuyerQualityRequirements() {
    return this.request<{ success: boolean; data: any[] }>('/qc/buyer-requirements');
  }

  async createBuyerQualityRequirement(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/qc/buyer-requirements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getQCSamplePreparations() {
    return this.request<{ success: boolean; data: any[] }>('/qc/sample-preparations');
  }

  async verifyQCSamplePreparation(sampleId: string, data: { qcNotes?: string }) {
    return this.request<{ success: boolean; data: any }>(`/qc/sample-preparations/${sampleId}/verify`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== EXPORT ====================
  async getExporterStats() {
    return this.request<{ success: boolean; data: any }>('/exports/stats');
  }

  async getExporterReporting() {
    return this.request<{ success: boolean; data: any }>('/exports/reporting');
  }

  async getExporterEudrRiskAssessments() {
    return this.request<{ success: boolean; data: any[] }>('/exports/eudr/risk-assessments');
  }

  async getApprovedBatches() {
    return this.request<{ success: boolean; data: any[] }>('/exports/batches/approved');
  }

  async getLogisticsAuthorizedOrders() {
    return this.request<{ success: boolean; data: any[] }>(`/exports/logistics/authorized-orders?_=${Date.now()}`);
  }

  async authorizeBatchForShipment(batchId: string) {
    return this.request<{ success: boolean; data: any }>(`/exports/batches/${batchId}/authorize-shipment`, {
      method: 'PATCH',
    });
  }

  async createShipment(data: {
    batchId: string;
    batchIds?: string[];
    containerNo: string;
    vesselName?: string;
    portLoading?: string;
    portDestination: string;
    shippingLine?: string;
    incoterm?: string;
    quotedFreightCost?: number;
    actualFreightCost?: number;
    insuranceDetails?: string;
    customsStatus?: string;
    naebLicense?: string;
    eudrVerifiedLoc?: string;
    destinationMarket?: string;
    orderId?: string;
    containerType?: string;
    sealNo?: string;
    loadedWeightKg?: string | number;
    loadingDate?: string;
    departureDate?: string;
    estimatedArrivalDate?: string;
  }) {
    return this.request<{ success: boolean; data: any }>('/exports/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateComplianceDoc(data: {
    shipmentId: string;
    batchId: string;
    documentType: string;
    naebLicense?: string;
    eudrVerifiedLoc?: string;
    certificationType: string;
  }) {
    return this.request<{ success: boolean; data: any }>('/exports/compliance-docs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateComplianceDocStatus(docId: string, data: { status: string; reason?: string }) {
    return this.request<{ success: boolean; data: any }>(`/exports/compliance-docs/${docId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getExporterSupportTickets() {
    return this.request<{ success: boolean; data: any[] }>('/exports/support-tickets');
  }

  async createExporterSupportTicket(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/exports/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== TRACEABILITY ====================
  async getTraceability(qrCode: string) {
    return this.request<{ success: boolean; data: any }>(`/traceability/${qrCode}`);
  }

  // ==================== ADMIN ====================
  async createUser(data: { fullName: string; email: string; phone: string; roleName: string }) {
    return this.request<{ success: boolean; data: any }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllUsers(page = 1, limit = 20, role?: string) {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (role) params.append('role', role);
    return this.request<{ success: boolean; data: any[]; pagination: any }>(`/admin/users?${params}`);
  }

  async updateUser(userId: string, data: { status?: string; roleName?: string; mfaEnabled?: boolean }) {
    return this.request<{ success: boolean; data: any }>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string) {
    return this.request<{ success: boolean; data: any }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async getAuditLogs(page = 1, limit = 50) {
    return this.request<{ success: boolean; data: any[]; pagination: any }>(
      `/admin/audit-logs?page=${page}&limit=${limit}`
    );
  }

  async exportAuditLogs() {
    return this.request<{ success: boolean; data: { fileName: string; csv: string } }>('/admin/audit-logs/export');
  }

  async getSystemAnalytics() {
    return this.request<{ success: boolean; data: any }>('/admin/analytics');
  }

  async getAdminOperations() {
    return this.request<{ success: boolean; data: any }>('/admin/operations');
  }

  async getRequirementCompletion() {
    return this.request<{ success: boolean; data: any }>('/admin/requirements/completion');
  }

  async getAdminSampleWorkflow() {
    return this.request<{ success: boolean; data: any[] }>('/admin/sample-workflow');
  }

  async bulkImportFarmers(data: { cooperativeId: string; aggregatorId?: string; defaultPassword?: string; farmers: any[] }) {
    return this.request<{ success: boolean; data: any }>('/admin/farmers/bulk-import', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createAuditSchedule(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/audit-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccessRequest(requestId: string, status: string) {
    return this.request<{ success: boolean; data: any }>(`/admin/access-requests/${requestId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async createSustainabilityMetric(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/sustainability-metrics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateCustomReport(data: Record<string, any>) {
    return this.request<{ success: boolean; data: { report: any; rows: any[]; groups: Record<string, number> | null; csv: string } }>('/admin/reports/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncBusinessDirectory(data: { sourceName?: string; records: any[] }) {
    return this.request<{ success: boolean; data: { results: any[] } }>('/admin/business-directory/sync', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRfidScanEvent(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/rfid/scan-events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createWarehouseBin(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/warehouse-bins', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createMobileInventoryScan(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/mobile-inventory-scans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runComplianceEvaluation(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/compliance/evaluate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateAuditPackage(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/audit-packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runSecurityMonitoring() {
    return this.request<{ success: boolean; data: any[] }>('/admin/security/monitor', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async createBuyerFeedback(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/buyer-feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createTradeFinanceRecord(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/trade-finance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runSustainabilityCalculation(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/sustainability/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createBiToolExport(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/bi/exports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async anchorBlockchainLedger(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/blockchain/anchor', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runPredictiveModel(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/predictive/run', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async generateJitPlan(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/jit/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifySustainabilityMetrics(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any[] }>('/admin/sustainability/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runRetentionArchive(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/retention/archive', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEudrProtectedAreas() {
    return this.request<{ success: boolean; data: any[] }>('/admin/eudr/protected-areas');
  }

  async createEudrProtectedArea(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/eudr/protected-areas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getEudrRiskAssessments() {
    return this.request<{ success: boolean; data: any[] }>('/admin/eudr/risk-assessments');
  }

  async searchEudrSupplierLocations(query = '') {
    const params = query ? `?q=${encodeURIComponent(query)}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/admin/eudr/supplier-locations${params}`);
  }

  async assessEudrFarmRisk(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/eudr/assess-farm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async runAllEudrRiskAssessments() {
    return this.request<{ success: boolean; data: any[] }>('/admin/eudr/run-all', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getImpactMonitoring() {
    return this.request<{ success: boolean; data: any }>('/admin/impact-monitoring');
  }

  async updateImpactIndicator(indicatorKey: string, data: { baselineValue: number; targetValue: number; notes?: string }) {
    return this.request<{ success: boolean; data: any }>(`/admin/impact-monitoring/indicators/${indicatorKey}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createImpactEvaluationRun(data: { periodLabel?: string }) {
    return this.request<{ success: boolean; data: any }>('/admin/impact-monitoring/runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminRoles() {
    return this.request<{ success: boolean; data: any[] }>('/admin/roles');
  }

  async updateRolePermissions(roleName: string, permissions: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/admin/roles/${roleName}/permissions`, {
      method: 'PATCH',
      body: JSON.stringify({ permissions }),
    });
  }

  async resetRolePermissionsToDefaults() {
    return this.request<{ success: boolean; data: any[] }>('/admin/roles/permissions/defaults', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async resetRolePermissionsToDefault(roleName: string) {
    return this.request<{ success: boolean; data: any }>(`/admin/roles/${roleName}/permissions/default`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getAdminSettings() {
    return this.request<{ success: boolean; data: any }>('/admin/settings');
  }

  async updateAdminSetting(key: string, value: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/admin/settings/${key}`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
  }

  async updateAdminIntegration(name: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/admin/integrations/${encodeURIComponent(name)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async runAdminBackup(target: string) {
    return this.request<{ success: boolean; data: any }>(`/admin/backups/${encodeURIComponent(target)}/run`, {
      method: 'POST',
    });
  }

  async updateAdminSupportTicket(ticketId: string, data: { status: string }) {
    return this.request<{ success: boolean; data: any }>(`/admin/support-tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getCooperatives() {
    return this.request<{ success: boolean; data: any[] }>('/admin/cooperatives');
  }

  async createCooperative(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/cooperatives', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCooperative(coopId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/admin/cooperatives/${coopId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getWorkStations() {
    return this.request<{ success: boolean; data: any[] }>('/admin/work-stations');
  }

  async createWorkStation(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/work-stations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorkStation(locationId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/admin/work-stations/${locationId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getAdminTruckCompanies() {
    return this.request<{ success: boolean; data: any[] }>('/admin/truck-companies');
  }

  async createTruckCompany(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/admin/truck-companies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTruckCompany(truckCompanyId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/admin/truck-companies/${truckCompanyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // ==================== NOTIFICATIONS ====================
  async getNotifications() {
    return this.request<{ success: boolean; data: any[]; unreadCount: number }>('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<{ success: boolean }>('/notifications/read-all', { method: 'PATCH' });
  }

  // ==================== SHIPMENTS / LOGISTICS ====================
  async getShipments() {
    return this.request<{ success: boolean; data: any[] }>('/exports/shipments');
  }

  async getLogisticsDashboard() {
    return this.request<{ success: boolean; data: any }>('/exports/logistics/dashboard');
  }

  async updateShipmentStatus(shipmentId: string, status: string, details: Record<string, any> = {}) {
    return this.request<{ success: boolean; data: any }>(`/exports/shipments/${shipmentId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...details }),
    });
  }

  async confirmProofOfDelivery(shipmentId: string, data: { podUrl: string; portArrivalAt?: string; notes?: string; receiverName?: string; sealCondition?: string; podFileName?: string }) {
    return this.request<{ success: boolean; data: any }>(`/exports/shipments/${shipmentId}/proof-of-delivery`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getComplianceDocs() {
    return this.request<{ success: boolean; data: any[] }>('/exports/compliance-docs');
  }

  async logLogisticsEvent(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/exports/logistics/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncNaebShipment(shipmentId: string) {
    return this.request<{ success: boolean; data: any }>(`/exports/shipments/${shipmentId}/naeb-sync`, {
      method: 'POST',
    });
  }

  async getRoadTransports() {
    return this.request<{ success: boolean; data: any[] }>('/exports/logistics/road-transports');
  }

  async getTruckCompanies() {
    return this.request<{ success: boolean; data: any[] }>('/exports/truck-companies');
  }

  async createRoadTransport(shipmentId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>(`/exports/shipments/${shipmentId}/road-transport`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createRoadTransitCheckpoint(roadTransportId: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any; status: string }>(`/exports/road-transports/${roadTransportId}/checkpoints`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeRoadTransportJourney(roadTransportId: string) {
    return this.request<{ success: boolean; data: any }>(`/exports/road-transports/${roadTransportId}/complete`, {
      method: 'PATCH',
    });
  }

  async getDriverTrip(accessToken: string) {
    return this.request<{ success: boolean; data: any }>(`/exports/driver-trips/${accessToken}`);
  }

  async submitDriverTripCheckpoint(accessToken: string, data: Record<string, any>) {
    return this.request<{ success: boolean; data: any; status: string }>(`/exports/driver-trips/${accessToken}/checkpoints`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLogisticsSupportTickets() {
    return this.request<{ success: boolean; data: any[] }>('/exports/logistics/support-tickets');
  }

  async createLogisticsSupportTicket(data: Record<string, any>) {
    return this.request<{ success: boolean; data: any }>('/exports/logistics/support-tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== EXPORT ORDERS ====================
  async getExportOrders() {
    return this.request<{ success: boolean; data: any[] }>('/exports/orders');
  }

  async createExportOrder(data: {
    buyer: string;
    customerName?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    country: string;
    weight: number;
    grade: string;
    pricePerKg: number;
    qualitySpecs?: any;
    shipmentRequirements?: any;
    message?: string;
    batchId?: string;
  }) {
    return this.request<{ success: boolean; data: any }>('/exports/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExportOrderStatus(orderId: string, data: {
    status: string;
    pricePerKg?: number;
    quoteNotes?: string;
    batchId?: string;
    allocations?: Array<{ batchId: string; allocatedWeightKg?: number; matchScore?: number }>;
  }) {
    return this.request<{ success: boolean; data: any }>(`/exports/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getOrderMatchingBatches(orderId: string) {
    return this.request<{ success: boolean; data: { order: any; matches: any[] } }>(`/exports/orders/${orderId}/matching-batches`);
  }

  async allocateOrderBatches(orderId: string, data: { allocations: Array<{ batchId: string; allocatedWeightKg?: number; matchScore?: number }> }) {
    return this.request<{ success: boolean; data: any }>(`/exports/orders/${orderId}/allocations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSampleDispatches() {
    return this.request<{ success: boolean; data: any[] }>('/exports/logistics/sample-dispatches');
  }

  async dispatchCustomerSample(sampleId: string, data: { carrier: string; trackingNo: string; notes?: string }) {
    return this.request<{ success: boolean; data: any }>(`/exports/logistics/sample-dispatches/${sampleId}/dispatch`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createExportOrderMessage(orderId: string, data: { message: string }) {
    return this.request<{ success: boolean; data: any }>(`/exports/orders/${orderId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== FARMER PAYMENTS ====================
  async getFarmerPayments() {
    return this.request<{ success: boolean; data: any[]; summary: { total: number; pending: number } }>('/exports/farmer-payments');
  }

  // ==================== QC HISTORY ====================
}

// Singleton instance
const apiService = new ApiService();
export default apiService;
