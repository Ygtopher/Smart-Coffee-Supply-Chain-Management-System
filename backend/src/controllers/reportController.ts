import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/authMiddleware';

type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  dateField?: string;
  statusField?: string;
  columns: { key: string; label: string }[];
  query: (userId: string, filters: any) => Promise<any[]>;
};

const toNumber = (value: any) => Number(value || 0);
const toIsoDate = (value: any) => value ? new Date(value).toISOString().slice(0, 10) : '';

const csvEscape = (value: any) => {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const toCsv = (columns: ReportTemplate['columns'], rows: any[]) => [
  columns.map(column => csvEscape(column.label)).join(','),
  ...rows.map(row => columns.map(column => csvEscape(row[column.key])).join(',')),
].join('\n');

const ensureSamplePreparationStorage = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sample_preparations" (
      "sample_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "order_id" TEXT NOT NULL REFERENCES "export_orders"("order_id") ON DELETE CASCADE,
      "batch_id" TEXT NULL REFERENCES "coffee_batches"("batch_id") ON DELETE SET NULL,
      "sample_quantity_g" INTEGER NULL,
      "status" VARCHAR(60) NOT NULL DEFAULT 'Awaiting QC Verification',
      "qc_notes" TEXT NULL,
      "verified_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "verified_at" TIMESTAMP NULL,
      "dispatch_carrier" VARCHAR(150) NULL,
      "tracking_no" VARCHAR(150) NULL,
      "dispatch_notes" TEXT NULL,
      "dispatched_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "dispatched_at" TIMESTAMP NULL,
      "created_by" TEXT NULL REFERENCES "users"("user_id") ON DELETE SET NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "sample_preparations_order_id_key" ON "sample_preparations" ("order_id")`);
};

const ensureRoadReportStorage = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "road_transport_records" (
      "road_transport_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "shipment_id" TEXT NOT NULL UNIQUE REFERENCES "shipping_records"("shipment_id") ON DELETE CASCADE,
      "truck_company_id" TEXT NULL,
      "truck_plate" VARCHAR(30) NOT NULL,
      "driver_name" VARCHAR(150) NULL,
      "driver_phone" VARCHAR(30) NULL,
      "transporter_company" VARCHAR(150) NULL,
      "origin_location" VARCHAR(150) NOT NULL DEFAULT 'Kigali',
      "destination_port" VARCHAR(150) NOT NULL DEFAULT 'Mombasa Port',
      "container_no" VARCHAR(100) NULL,
      "seal_no" VARCHAR(100) NULL,
      "departure_time" TIMESTAMP NULL,
      "expected_arrival" TIMESTAMP NULL,
      "actual_arrival" TIMESTAMP NULL,
      "status" VARCHAR(50) NOT NULL DEFAULT 'Planned',
      "driver_access_token" VARCHAR(128) NULL UNIQUE,
      "driver_access_expires_at" TIMESTAMP NULL,
      "created_by" TEXT NULL REFERENCES "users"("user_id"),
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "road_transit_checkpoints" (
      "checkpoint_id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      "road_transport_id" TEXT NOT NULL REFERENCES "road_transport_records"("road_transport_id") ON DELETE CASCADE,
      "checkpoint_name" VARCHAR(150) NOT NULL,
      "scan_code" VARCHAR(150) NULL,
      "latitude" NUMERIC(10,7) NULL,
      "longitude" NUMERIC(10,7) NULL,
      "location_accuracy_m" NUMERIC(10,2) NULL,
      "event_type" VARCHAR(60) NOT NULL,
      "seal_condition" VARCHAR(50) NULL,
      "recorded_by" TEXT NULL REFERENCES "users"("user_id"),
      "submission_source" VARCHAR(30) NOT NULL DEFAULT 'LOGISTICS',
      "submitted_ip" VARCHAR(80) NULL,
      "recorded_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "notes" TEXT NULL
    )
  `);
};

const deriveRoadStatus = (fallbackStatus: string, latestEvent?: string) => {
  const event = String(latestEvent || '').trim().toLowerCase();
  if (event.includes('loading') || event === 'loaded' || event.includes('container loaded')) return 'Loaded';
  if (event.includes('port arrival') || event.includes('arrived at port')) return 'At Port';
  if (event.includes('border exit')) return 'At Border';
  if (event.includes('border entry') || event.includes('transit checkpoint')) return 'In Transit';
  if (event.includes('dispatch')) return 'Dispatched';
  return fallbackStatus || 'Planned';
};

const applyCommonFilters = (rows: any[], filters: any, template: ReportTemplate) => {
  const from = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const to = filters.dateTo ? new Date(filters.dateTo) : null;
  const status = String(filters.status || '').trim().toLowerCase();
  const search = String(filters.search || '').trim().toLowerCase();
  return rows.filter(row => {
    const dateValue = template.dateField ? row[template.dateField] : null;
    const date = dateValue ? new Date(dateValue) : null;
    const statusValue = template.statusField ? String(row[template.statusField] || '').toLowerCase() : '';
    const text = Object.values(row).join(' ').toLowerCase();
    if (from && date && date < from) return false;
    if (to && date && date > new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)) return false;
    if (status && template.statusField && statusValue !== status) return false;
    if (search && !text.includes(search)) return false;
    return true;
  });
};

const templatesByRole: Record<string, ReportTemplate[]> = {
  FARMER: [
    {
      id: 'pickup-history',
      title: 'Pickup History Report',
      description: 'All pickup requests and completed deliveries for this supplier.',
      dateField: 'deliveryDate',
      statusField: 'status',
      columns: [
        { key: 'deliveryId', label: 'Pickup ID' },
        { key: 'deliveryDate', label: 'Date' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Status' },
        { key: 'batchId', label: 'Batch ID' },
        { key: 'paymentReceipt', label: 'Receipt' },
      ],
      query: async (userId) => {
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT dr.delivery_id, dr.delivery_date, dr.weight_kg, dr.batch_id,
                 COALESCE(pt.status, 'Recorded') AS status,
                 COALESCE(pt.reference_code, '') AS payment_receipt
          FROM delivery_records dr
          JOIN farmer_profiles fp ON fp.profile_id = dr.profile_id
          LEFT JOIN payment_transactions pt ON pt.delivery_id = dr.delivery_id
          WHERE fp.user_id = ${userId}
          ORDER BY dr.delivery_date DESC
        `;
        return rows.map(row => ({
          deliveryId: row.delivery_id,
          deliveryDate: toIsoDate(row.delivery_date),
          weightKg: toNumber(row.weight_kg),
          status: row.status,
          batchId: row.batch_id || '',
          paymentReceipt: row.payment_receipt,
        }));
      },
    },
    {
      id: 'traceability',
      title: 'Batch Traceability Report',
      description: 'Batches connected to this supplier, with station and quality status.',
      dateField: 'createdAt',
      statusField: 'status',
      columns: [
        { key: 'qrCode', label: 'QR Code' },
        { key: 'farmName', label: 'Farm / Cooperative' },
        { key: 'washingStation', label: 'Washing Station' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
      ],
      query: async (userId) => {
        const rows = await prisma.coffeeBatch.findMany({
          where: { farmerId: userId },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        return rows.map(batch => ({
          qrCode: batch.qrCode,
          farmName: batch.farmName,
          washingStation: batch.washingStation,
          weightKg: toNumber(batch.weightCherry),
          status: batch.status,
          createdAt: toIsoDate(batch.createdAt),
        }));
      },
    },
  ],
  AGGREGATOR: [
    {
      id: 'collection-summary',
      title: 'Collection Summary Report',
      description: 'Pickup records from farmers assigned to this aggregator.',
      dateField: 'deliveryDate',
      statusField: 'status',
      columns: [
        { key: 'farmerName', label: 'Supplier' },
        { key: 'deliveryDate', label: 'Pickup Date' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Payment Status' },
        { key: 'receipt', label: 'Receipt' },
      ],
      query: async (userId) => {
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT u.full_name, dr.delivery_date, dr.weight_kg,
                 COALESCE(pt.status, 'Recorded') AS status,
                 COALESCE(pt.reference_code, '') AS receipt
          FROM delivery_records dr
          JOIN farmer_profiles fp ON fp.profile_id = dr.profile_id
          JOIN users u ON u.user_id = fp.user_id
          LEFT JOIN payment_transactions pt ON pt.delivery_id = dr.delivery_id
          WHERE fp.aggregator_id = ${userId}
          ORDER BY dr.delivery_date DESC
        `;
        return rows.map(row => ({
          farmerName: row.full_name,
          deliveryDate: toIsoDate(row.delivery_date),
          weightKg: toNumber(row.weight_kg),
          status: row.status,
          receipt: row.receipt,
        }));
      },
    },
    {
      id: 'batch-creation',
      title: 'Batch Creation & QR Report',
      description: 'Batches created from suppliers assigned to this aggregator.',
      dateField: 'createdAt',
      statusField: 'status',
      columns: [
        { key: 'qrCode', label: 'QR Code' },
        { key: 'farmName', label: 'Origin' },
        { key: 'washingStation', label: 'Washing Station' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
      ],
      query: async (userId) => {
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT cb.qr_code, cb.farm_name, cb.washing_station, cb.weight_cherry, cb.status, cb.created_at
          FROM coffee_batches cb
          JOIN farmer_profiles fp ON fp.user_id = cb.farmer_id
          WHERE fp.aggregator_id = ${userId}
          ORDER BY cb.created_at DESC
        `;
        return rows.map(row => ({
          qrCode: row.qr_code,
          farmName: row.farm_name,
          washingStation: row.washing_station,
          weightKg: toNumber(row.weight_cherry),
          status: row.status,
          createdAt: toIsoDate(row.created_at),
        }));
      },
    },
  ],
  PROCESSOR: [
    {
      id: 'processing-queue',
      title: 'Processing Queue Report',
      description: 'Batches at washing stations assigned to this processor.',
      dateField: 'createdAt',
      statusField: 'status',
      columns: [
        { key: 'qrCode', label: 'QR Code' },
        { key: 'farmName', label: 'Origin' },
        { key: 'washingStation', label: 'Station' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
      ],
      query: async (userId) => {
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT cb.qr_code, cb.farm_name, cb.washing_station, cb.weight_cherry, cb.status, cb.created_at
          FROM coffee_batches cb
          JOIN warehouse_locations wl ON wl.name = cb.washing_station
          WHERE wl.processor_id = ${userId}
          ORDER BY cb.created_at DESC
        `;
        return rows.map(row => ({
          qrCode: row.qr_code,
          farmName: row.farm_name,
          washingStation: row.washing_station,
          weightKg: toNumber(row.weight_cherry),
          status: row.status,
          createdAt: toIsoDate(row.created_at),
        }));
      },
    },
    {
      id: 'station-inventory',
      title: 'Station Inventory Report',
      description: 'Inventory items and FIFO status for assigned stations.',
      statusField: 'status',
      columns: [
        { key: 'lotNo', label: 'Lot No' },
        { key: 'qrCode', label: 'Batch QR' },
        { key: 'warehouse', label: 'Station' },
        { key: 'coffeeForm', label: 'Coffee Form' },
        { key: 'quantityKg', label: 'Quantity Kg' },
        { key: 'status', label: 'Status' },
      ],
      query: async (userId) => {
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT ii.lot_no, cb.qr_code, wl.name, ii.coffee_form, ii.quantity_kg, ii.status
          FROM inventory_items ii
          JOIN coffee_batches cb ON cb.batch_id = ii.batch_id
          JOIN warehouse_locations wl ON wl.location_id = ii.warehouse_id
          WHERE wl.processor_id = ${userId}
          ORDER BY ii.fifo_date ASC
        `;
        return rows.map(row => ({
          lotNo: row.lot_no || '',
          qrCode: row.qr_code,
          warehouse: row.name,
          coffeeForm: row.coffee_form,
          quantityKg: toNumber(row.quantity_kg),
          status: row.status,
        }));
      },
    },
  ],
  QUALITY_CONTROLLER: [
    {
      id: 'cupping',
      title: 'Cupping Score Report',
      description: 'Quality assessments recorded by this QC user.',
      dateField: 'createdAt',
      columns: [
        { key: 'qrCode', label: 'Batch QR' },
        { key: 'farmName', label: 'Origin' },
        { key: 'cuppingScore', label: 'Cupping Score' },
        { key: 'moisture', label: 'Moisture' },
        { key: 'defects', label: 'Defects' },
        { key: 'createdAt', label: 'Assessed' },
      ],
      query: async (userId) => {
        const rows = await prisma.qualityAssessment.findMany({
          where: { assessorId: userId },
          include: { batch: true },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        return rows.map(row => ({
          qrCode: row.batch?.qrCode || '',
          farmName: row.batch?.farmName || '',
          cuppingScore: toNumber(row.cuppingScore),
          moisture: toNumber(row.moisture),
          defects: row.defects ? JSON.stringify(row.defects) : '',
          createdAt: toIsoDate(row.createdAt),
        }));
      },
    },
    {
      id: 'sample-verification',
      title: 'Customer Sample Verification Report',
      description: 'Customer samples verified or waiting for QC verification.',
      dateField: 'createdAt',
      statusField: 'status',
      columns: [
        { key: 'referenceCode', label: 'Reference' },
        { key: 'buyer', label: 'Buyer' },
        { key: 'qrCode', label: 'Batch QR' },
        { key: 'quantityG', label: 'Quantity g' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
      ],
      query: async () => {
        await ensureSamplePreparationStorage();
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT eo.reference_code, eo.buyer, cb.qr_code, sp.sample_quantity_g, sp.status, sp.created_at
          FROM sample_preparations sp
          JOIN export_orders eo ON eo.order_id = sp.order_id
          LEFT JOIN coffee_batches cb ON cb.batch_id = sp.batch_id
          ORDER BY sp.created_at DESC
        `;
        return rows.map(row => ({
          referenceCode: row.reference_code,
          buyer: row.buyer,
          qrCode: row.qr_code || '',
          quantityG: toNumber(row.sample_quantity_g),
          status: row.status,
          createdAt: toIsoDate(row.created_at),
        }));
      },
    },
  ],
  LOGISTICS: [
    {
      id: 'shipments',
      title: 'Shipment, Road Transport & POD Report',
      description: 'Export containers with truck-company movement, latest road checkpoint, and proof-of-delivery status.',
      dateField: 'shippedAt',
      statusField: 'status',
      columns: [
        { key: 'containerNo', label: 'Container' },
        { key: 'truckCompany', label: 'Truck Company' },
        { key: 'truckPlate', label: 'Truck Plate' },
        { key: 'driverName', label: 'Driver' },
        { key: 'destinationPort', label: 'Destination Port' },
        { key: 'status', label: 'Status' },
        { key: 'lastCheckpoint', label: 'Last Checkpoint' },
        { key: 'podStatus', label: 'POD Status' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'shippedAt', label: 'Delivered / Shipped' },
      ],
      query: async () => {
        await ensureRoadReportStorage();
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT sr.shipment_id, sr.container_no, sr.status AS shipment_status, sr.port_destination, sr.shipped_at,
                 cb.weight_cherry,
                 rtr.truck_plate, rtr.driver_name, rtr.transporter_company, rtr.status AS road_status,
                 tc.company_name AS truck_company_name,
                 cp.event_type AS last_checkpoint, cp.recorded_at AS last_checkpoint_at,
                 pod.status AS pod_status, pod.generated_at AS pod_uploaded_at
          FROM shipping_records sr
          LEFT JOIN coffee_batches cb ON cb.batch_id = sr.batch_id
          LEFT JOIN road_transport_records rtr ON rtr.shipment_id = sr.shipment_id
          LEFT JOIN truck_companies tc ON tc.truck_company_id = rtr.truck_company_id
          LEFT JOIN LATERAL (
            SELECT event_type, recorded_at
            FROM road_transit_checkpoints
            WHERE road_transport_id = rtr.road_transport_id
            ORDER BY recorded_at DESC
            LIMIT 1
          ) cp ON true
          LEFT JOIN LATERAL (
            SELECT status, generated_at
            FROM compliance_docs
            WHERE shipment_id = sr.shipment_id AND document_type = 'Proof of Delivery'
            ORDER BY generated_at DESC
            LIMIT 1
          ) pod ON true
          ORDER BY COALESCE(sr.shipped_at, sr.created_at) DESC
          LIMIT 500
        `;
        return rows.map(row => ({
          containerNo: row.container_no,
          truckCompany: row.truck_company_name || row.transporter_company || '',
          truckPlate: row.truck_plate || '',
          driverName: row.driver_name || 'Chosen by truck company',
          destinationPort: row.port_destination,
          status: deriveRoadStatus(row.road_status || row.shipment_status, row.last_checkpoint),
          lastCheckpoint: row.last_checkpoint ? `${row.last_checkpoint} (${toIsoDate(row.last_checkpoint_at)})` : 'No checkpoint',
          podStatus: row.pod_status || 'Not uploaded',
          weightKg: toNumber(row.weight_cherry),
          shippedAt: toIsoDate(row.shipped_at),
        }));
      },
    },
    {
      id: 'transit-checkpoints',
      title: 'Transit Checkpoint Report',
      description: 'Road corridor checkpoint submissions from logistics users or truck-company driver links.',
      dateField: 'recordedAt',
      statusField: 'eventType',
      columns: [
        { key: 'containerNo', label: 'Container' },
        { key: 'truckCompany', label: 'Truck Company' },
        { key: 'checkpointName', label: 'Checkpoint' },
        { key: 'eventType', label: 'Event' },
        { key: 'coordinates', label: 'Coordinates' },
        { key: 'sealCondition', label: 'Seal' },
        { key: 'source', label: 'Source' },
        { key: 'recordedAt', label: 'Recorded' },
      ],
      query: async () => {
        await ensureRoadReportStorage();
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT COALESCE(rtr.container_no, sr.container_no) AS container_no,
                 COALESCE(tc.company_name, rtr.transporter_company, '') AS truck_company,
                 rtc.checkpoint_name, rtc.event_type, rtc.latitude, rtc.longitude, rtc.seal_condition,
                 rtc.submission_source, rtc.recorded_at
          FROM road_transit_checkpoints rtc
          JOIN road_transport_records rtr ON rtr.road_transport_id = rtc.road_transport_id
          LEFT JOIN shipping_records sr ON sr.shipment_id = rtr.shipment_id
          LEFT JOIN truck_companies tc ON tc.truck_company_id = rtr.truck_company_id
          ORDER BY rtc.recorded_at DESC
          LIMIT 500
        `;
        return rows.map(row => ({
          containerNo: row.container_no || '',
          truckCompany: row.truck_company || '',
          checkpointName: row.checkpoint_name,
          eventType: row.event_type,
          coordinates: row.latitude && row.longitude ? `${row.latitude}, ${row.longitude}` : '',
          sealCondition: row.seal_condition || '',
          source: row.submission_source || 'LOGISTICS',
          recordedAt: toIsoDate(row.recorded_at),
        }));
      },
    },
    {
      id: 'proof-of-delivery',
      title: 'Proof of Delivery Register',
      description: 'Delivered shipments and POD documents uploaded by Logistics.',
      dateField: 'uploadedAt',
      statusField: 'podStatus',
      columns: [
        { key: 'containerNo', label: 'Container' },
        { key: 'batchQr', label: 'Batch QR' },
        { key: 'destinationPort', label: 'Destination Port' },
        { key: 'truckCompany', label: 'Truck Company' },
        { key: 'podStatus', label: 'POD Status' },
        { key: 'documentType', label: 'Document Type' },
        { key: 'uploadedAt', label: 'Uploaded' },
      ],
      query: async () => {
        await ensureRoadReportStorage();
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT sr.container_no, sr.port_destination, cb.qr_code,
                 COALESCE(tc.company_name, rtr.transporter_company, '') AS truck_company,
                 cd.status AS pod_status, cd.document_type, cd.generated_at
          FROM shipping_records sr
          LEFT JOIN coffee_batches cb ON cb.batch_id = sr.batch_id
          LEFT JOIN road_transport_records rtr ON rtr.shipment_id = sr.shipment_id
          LEFT JOIN truck_companies tc ON tc.truck_company_id = rtr.truck_company_id
          LEFT JOIN compliance_docs cd ON cd.shipment_id = sr.shipment_id AND cd.document_type = 'Proof of Delivery'
          WHERE sr.status = 'Delivered' OR cd.doc_id IS NOT NULL
          ORDER BY COALESCE(cd.generated_at, sr.shipped_at) DESC
          LIMIT 500
        `;
        return rows.map(row => ({
          containerNo: row.container_no,
          batchQr: row.qr_code || '',
          destinationPort: row.port_destination,
          truckCompany: row.truck_company || '',
          podStatus: row.pod_status || 'Missing',
          documentType: row.document_type || 'Proof of Delivery',
          uploadedAt: toIsoDate(row.generated_at),
        }));
      },
    },
    {
      id: 'sample-dispatch',
      title: 'Customer Sample Dispatch Report',
      description: 'Samples released by QC and dispatched by Logistics.',
      dateField: 'dispatchedAt',
      statusField: 'status',
      columns: [
        { key: 'referenceCode', label: 'Reference' },
        { key: 'buyer', label: 'Buyer' },
        { key: 'status', label: 'Status' },
        { key: 'carrier', label: 'Carrier' },
        { key: 'trackingNo', label: 'Tracking No' },
        { key: 'dispatchedAt', label: 'Dispatched' },
      ],
      query: async () => {
        await ensureSamplePreparationStorage();
        const rows = await prisma.$queryRaw<Array<any>>`
          SELECT eo.reference_code, eo.buyer, sp.status, sp.dispatch_carrier, sp.tracking_no, sp.dispatched_at
          FROM sample_preparations sp
          JOIN export_orders eo ON eo.order_id = sp.order_id
          ORDER BY sp.updated_at DESC
        `;
        return rows.map(row => ({
          referenceCode: row.reference_code,
          buyer: row.buyer,
          status: row.status,
          carrier: row.dispatch_carrier || '',
          trackingNo: row.tracking_no || '',
          dispatchedAt: toIsoDate(row.dispatched_at),
        }));
      },
    },
  ],
  EXPORTER: [
    {
      id: 'orders',
      title: 'Customer Order Report',
      description: 'Customer orders and sample requests managed by Exporter.',
      dateField: 'orderDate',
      statusField: 'status',
      columns: [
        { key: 'referenceCode', label: 'Reference' },
        { key: 'buyer', label: 'Buyer' },
        { key: 'country', label: 'Country' },
        { key: 'grade', label: 'Grade' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Status' },
        { key: 'orderDate', label: 'Date' },
      ],
      query: async () => {
        const rows = await prisma.exportOrder.findMany({ orderBy: { orderDate: 'desc' }, take: 500 });
        return rows.map(row => ({
          referenceCode: row.referenceCode || row.orderId.slice(0, 8),
          buyer: row.buyer,
          country: row.country,
          grade: row.grade,
          weightKg: toNumber(row.weight),
          status: row.status,
          orderDate: toIsoDate(row.orderDate),
        }));
      },
    },
    {
      id: 'export-ready',
      title: 'Export-Ready Batch Report',
      description: 'Quality certified batches available for shipment authorization.',
      dateField: 'createdAt',
      statusField: 'status',
      columns: [
        { key: 'qrCode', label: 'QR Code' },
        { key: 'farmName', label: 'Origin' },
        { key: 'washingStation', label: 'Station' },
        { key: 'weightKg', label: 'Weight Kg' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
      ],
      query: async () => {
        const rows = await prisma.coffeeBatch.findMany({
          where: { status: { in: ['export_ready', 'shipment_authorized'] } },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
        return rows.map(row => ({
          qrCode: row.qrCode,
          farmName: row.farmName,
          washingStation: row.washingStation,
          weightKg: toNumber(row.weightCherry),
          status: row.status,
          createdAt: toIsoDate(row.createdAt),
        }));
      },
    },
  ],
  ADMIN: [],
};

templatesByRole.ADMIN = [
  ...templatesByRole.FARMER,
  ...templatesByRole.AGGREGATOR,
  ...templatesByRole.PROCESSOR,
  ...templatesByRole.QUALITY_CONTROLLER,
  ...templatesByRole.LOGISTICS,
  ...templatesByRole.EXPORTER,
  {
    id: 'user-activity',
    title: 'User Activity Report',
    description: 'Recent audit events and account activity.',
    dateField: 'timestamp',
    columns: [
      { key: 'user', label: 'User' },
      { key: 'role', label: 'Role' },
      { key: 'action', label: 'Action' },
      { key: 'entityType', label: 'Entity' },
      { key: 'timestamp', label: 'Time' },
    ],
    query: async () => {
      const rows = await prisma.auditLog.findMany({
        include: { user: { include: { role: true } } },
        orderBy: { timestamp: 'desc' },
        take: 500,
      });
      return rows.map(row => ({
        user: row.user?.fullName || row.userId || 'System',
        role: row.user?.role?.roleName || '',
        action: row.action,
        entityType: row.entityType,
        timestamp: row.timestamp.toISOString(),
      }));
    },
  },
];

const roleTemplates = (roleName?: string) => templatesByRole[roleName || ''] || [];

export const getReportTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
  const roleName = req.user?.role;
  res.status(200).json({
    success: true,
    data: roleTemplates(roleName).map(({ query, ...template }) => template),
  });
};

export const generateRoleReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const roleName = req.user?.role;
    const { templateId, filters = {} } = req.body;
    const template = roleTemplates(roleName).find(item => item.id === templateId);
    if (!template) {
      res.status(404).json({ message: 'Report template not available for your role.' });
      return;
    }
    const rows = applyCommonFilters(await template.query(req.user!.userId, filters), filters, template);
    const totalWeight = rows.reduce((sum, row) => sum + toNumber(row.weightKg), 0);
    const statusCounts = template.statusField
      ? rows.reduce<Record<string, number>>((acc, row) => {
          const key = String(row[template.statusField!] || 'Unspecified');
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {})
      : null;
    res.status(200).json({
      success: true,
      data: {
        template: { id: template.id, title: template.title, description: template.description, columns: template.columns },
        rows,
        summary: { rowCount: rows.length, totalWeightKg: Number(totalWeight.toFixed(2)), statusCounts },
        csv: toCsv(template.columns, rows),
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error generating role report:', error);
    res.status(500).json({ message: 'Server error generating report' });
  }
};
