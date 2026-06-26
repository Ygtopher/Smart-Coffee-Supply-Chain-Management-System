import crypto from 'crypto';
import prisma from '../config/db';

export type EudrRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'NOT_VERIFIED';

type ProtectedArea = {
  area_id: string;
  name: string;
  area_type: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  risk_level: EudrRiskLevel;
  notes: string | null;
};

type RiskInput = {
  supplierId?: string | null;
  supplierName?: string | null;
  sourceType?: string;
  sourceId?: string | null;
  farmName?: string | null;
  farmLocation?: string | null;
  coordinates?: string | null;
  assessedBy?: string | null;
};

const DEFAULT_PROTECTED_AREAS = [
  {
    areaId: 'nyungwe-national-park',
    name: 'Nyungwe National Park',
    areaType: 'National Park',
    latitude: -2.4800,
    longitude: 29.2050,
    radiusKm: 35,
    riskLevel: 'HIGH',
    notes: 'Default EUDR screening zone for farms close to Nyungwe forest.',
  },
  {
    areaId: 'volcanoes-national-park',
    name: 'Volcanoes National Park',
    areaType: 'National Park',
    latitude: -1.4750,
    longitude: 29.5200,
    radiusKm: 18,
    riskLevel: 'HIGH',
    notes: 'Default EUDR screening zone for farms close to Volcanoes National Park.',
  },
  {
    areaId: 'akagera-national-park',
    name: 'Akagera National Park',
    areaType: 'National Park',
    latitude: -1.9000,
    longitude: 30.7500,
    radiusKm: 45,
    riskLevel: 'HIGH',
    notes: 'Default EUDR screening zone for farms close to Akagera National Park.',
  },
  {
    areaId: 'gishwati-mukura-national-park',
    name: 'Gishwati-Mukura National Park',
    areaType: 'National Park',
    latitude: -1.7800,
    longitude: 29.3500,
    radiusKm: 18,
    riskLevel: 'HIGH',
    notes: 'Default EUDR screening zone for farms close to Gishwati-Mukura forest.',
  },
  {
    areaId: 'rugezi-marsh',
    name: 'Rugezi Marsh',
    areaType: 'Protected Wetland',
    latitude: -1.4000,
    longitude: 29.8500,
    radiusKm: 12,
    riskLevel: 'MEDIUM',
    notes: 'Default screening zone for farms close to a protected wetland.',
  },
] as const;

export const parseCoordinates = (value?: string | null) => {
  const parts = String(value || '')
    .split(',')
    .map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) return null;
  const [latitude, longitude] = parts;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
};

const toRadians = (degrees: number) => degrees * (Math.PI / 180);

const distanceKm = (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const ensureEudrRiskStorage = async () => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS protected_areas (
      area_id TEXT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      area_type VARCHAR(80) NOT NULL DEFAULT 'Protected Area',
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      radius_km DOUBLE PRECISION NOT NULL DEFAULT 5,
      risk_level VARCHAR(30) NOT NULL DEFAULT 'HIGH',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS deforestation_risk_assessments (
      assessment_id TEXT PRIMARY KEY,
      supplier_id TEXT NULL REFERENCES users(user_id) ON DELETE SET NULL,
      supplier_name VARCHAR(180) NULL,
      source_type VARCHAR(60) NOT NULL DEFAULT 'farmer_profile',
      source_id TEXT NULL,
      farm_name VARCHAR(180) NULL,
      farm_location VARCHAR(255) NULL,
      coordinates VARCHAR(100) NOT NULL,
      risk_level VARCHAR(30) NOT NULL,
      risk_score INTEGER NOT NULL,
      nearest_area_name VARCHAR(180) NULL,
      nearest_distance_km DOUBLE PRECISION NULL,
      data_source VARCHAR(180) NOT NULL DEFAULT 'Protected-area proximity rules',
      assessment_notes TEXT NULL,
      assessed_by TEXT NULL REFERENCES users(user_id) ON DELETE SET NULL,
      checked_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_deforestation_supplier ON deforestation_risk_assessments(supplier_id, checked_at DESC)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_deforestation_risk ON deforestation_risk_assessments(risk_level, checked_at DESC)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE coffee_batches ADD COLUMN IF NOT EXISTS deforestation_risk_level VARCHAR(30) NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE coffee_batches ADD COLUMN IF NOT EXISTS deforestation_risk_score INTEGER NULL`);
  await prisma.$executeRawUnsafe(`ALTER TABLE coffee_batches ADD COLUMN IF NOT EXISTS deforestation_checked_at TIMESTAMP NULL`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS cooperative_member_farms (
      farm_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      cooperative_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      farm_name VARCHAR(150) NOT NULL,
      farm_location VARCHAR(255) NULL,
      coordinates VARCHAR(100) NOT NULL,
      farm_size_ha NUMERIC(12,2) NULL,
      coffee_varieties TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_cooperative_member_farms_user_id ON cooperative_member_farms(cooperative_user_id)`);

  const countRows = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM protected_areas`;
  if (Number(countRows[0]?.count || 0) === 0) {
    for (const area of DEFAULT_PROTECTED_AREAS) {
      await prisma.$executeRaw`
        INSERT INTO protected_areas (area_id, name, area_type, latitude, longitude, radius_km, risk_level, notes)
        VALUES (${area.areaId}, ${area.name}, ${area.areaType}, ${area.latitude}, ${area.longitude}, ${area.radiusKm}, ${area.riskLevel}, ${area.notes})
        ON CONFLICT (area_id) DO NOTHING
      `;
    }
  }
};

export const getProtectedAreas = async () => {
  await ensureEudrRiskStorage();
  return prisma.$queryRaw<ProtectedArea[]>`
    SELECT area_id, name, area_type, latitude, longitude, radius_km, risk_level, notes
    FROM protected_areas
    ORDER BY name ASC
  `;
};

export const createProtectedArea = async (input: Record<string, any>) => {
  await ensureEudrRiskStorage();
  const areaId = crypto.randomUUID();
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const radiusKm = Number(input.radiusKm || input.radius_km || 5);
  if (!input.name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radiusKm)) {
    throw new Error('Protected area name, latitude, longitude, and radius are required');
  }
  const rows = await prisma.$queryRaw<Array<any>>`
    INSERT INTO protected_areas (area_id, name, area_type, latitude, longitude, radius_km, risk_level, notes)
    VALUES (
      ${areaId},
      ${String(input.name).trim()},
      ${String(input.areaType || input.area_type || 'Protected Area').trim()},
      ${latitude},
      ${longitude},
      ${radiusKm},
      ${String(input.riskLevel || input.risk_level || 'HIGH').trim().toUpperCase()},
      ${input.notes ? String(input.notes) : null}
    )
    RETURNING area_id, name, area_type, latitude, longitude, radius_km, risk_level, notes
  `;
  return rows[0];
};

export const calculateDeforestationRisk = async (coordinates?: string | null) => {
  await ensureEudrRiskStorage();
  const parsed = parseCoordinates(coordinates);
  if (!parsed) {
    return {
      riskLevel: 'NOT_VERIFIED' as EudrRiskLevel,
      riskScore: 0,
      nearestAreaName: null,
      nearestDistanceKm: null,
      notes: 'Coordinates are missing or invalid, so EUDR location screening cannot be completed.',
    };
  }

  const protectedAreas = await getProtectedAreas();
  const distances = protectedAreas.map((area) => ({
    area,
    distance: distanceKm(parsed, { latitude: Number(area.latitude), longitude: Number(area.longitude) }),
  })).sort((a, b) => a.distance - b.distance);
  const nearest = distances[0];

  if (!nearest) {
    return {
      riskLevel: 'LOW' as EudrRiskLevel,
      riskScore: 20,
      nearestAreaName: null,
      nearestDistanceKm: null,
      notes: 'No protected-area reference data configured.',
    };
  }

  const radius = Number(nearest.area.radius_km);
  const bufferKm = 10;
  if (nearest.distance <= radius) {
    return {
      riskLevel: 'HIGH' as EudrRiskLevel,
      riskScore: 90,
      nearestAreaName: nearest.area.name,
      nearestDistanceKm: Number(nearest.distance.toFixed(2)),
      notes: `Farm coordinates are inside the ${nearest.area.name} screening radius.`,
    };
  }
  if (nearest.distance <= radius + bufferKm) {
    return {
      riskLevel: 'MEDIUM' as EudrRiskLevel,
      riskScore: 60,
      nearestAreaName: nearest.area.name,
      nearestDistanceKm: Number(nearest.distance.toFixed(2)),
      notes: `Farm coordinates are within ${bufferKm} km of the ${nearest.area.name} screening buffer.`,
    };
  }
  return {
    riskLevel: 'LOW' as EudrRiskLevel,
    riskScore: 20,
    nearestAreaName: nearest.area.name,
    nearestDistanceKm: Number(nearest.distance.toFixed(2)),
    notes: `Farm coordinates are outside configured protected-area screening buffers.`,
  };
};

export const assessAndStoreFarmRisk = async (input: RiskInput) => {
  await ensureEudrRiskStorage();
  const risk = await calculateDeforestationRisk(input.coordinates);
  const assessmentId = crypto.randomUUID();
  const rows = await prisma.$queryRaw<Array<any>>`
    INSERT INTO deforestation_risk_assessments (
      assessment_id, supplier_id, supplier_name, source_type, source_id, farm_name, farm_location,
      coordinates, risk_level, risk_score, nearest_area_name, nearest_distance_km, assessment_notes, assessed_by
    )
    VALUES (
      ${assessmentId},
      ${input.supplierId || null},
      ${input.supplierName || null},
      ${input.sourceType || 'farmer_profile'},
      ${input.sourceId || null},
      ${input.farmName || null},
      ${input.farmLocation || null},
      ${input.coordinates || ''},
      ${risk.riskLevel},
      ${risk.riskScore},
      ${risk.nearestAreaName},
      ${risk.nearestDistanceKm},
      ${risk.notes},
      ${input.assessedBy || null}
    )
    RETURNING *
  `;
  return rows[0];
};

export const assessAllSupplierFarms = async (assessedBy?: string | null) => {
  await ensureEudrRiskStorage();
  const profileRows = await prisma.$queryRaw<Array<any>>`
    SELECT fp.profile_id AS source_id,
           fp.user_id AS supplier_id,
           u.full_name AS supplier_name,
           fp.farm_name,
           fp.gps_location AS farm_location,
           fp.coordinates
    FROM farmer_profiles fp
    JOIN users u ON u.user_id = fp.user_id
    WHERE fp.coordinates IS NOT NULL AND TRIM(fp.coordinates) <> ''
  `;
  const memberFarmRows = await prisma.$queryRaw<Array<any>>`
    SELECT cmf.farm_id AS source_id,
           cmf.cooperative_user_id AS supplier_id,
           u.full_name AS supplier_name,
           cmf.farm_name,
           cmf.farm_location,
           cmf.coordinates
    FROM cooperative_member_farms cmf
    JOIN users u ON u.user_id = cmf.cooperative_user_id
    WHERE cmf.coordinates IS NOT NULL AND TRIM(cmf.coordinates) <> ''
  `;

  const results = [];
  for (const row of profileRows) {
    results.push(await assessAndStoreFarmRisk({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      sourceType: 'farmer_profile',
      sourceId: row.source_id,
      farmName: row.farm_name,
      farmLocation: row.farm_location,
      coordinates: row.coordinates,
      assessedBy,
    }));
  }
  for (const row of memberFarmRows) {
    results.push(await assessAndStoreFarmRisk({
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      sourceType: 'cooperative_member_farm',
      sourceId: row.source_id,
      farmName: row.farm_name,
      farmLocation: row.farm_location,
      coordinates: row.coordinates,
      assessedBy,
    }));
  }
  return results;
};

export const getRiskAssessments = async (limit = 200) => {
  await ensureEudrRiskStorage();
  return prisma.$queryRawUnsafe<Array<any>>(
    `SELECT assessment_id, supplier_id, supplier_name, source_type, source_id, farm_name, farm_location,
            coordinates, risk_level, risk_score, nearest_area_name, nearest_distance_km,
            data_source, assessment_notes, checked_at
     FROM deforestation_risk_assessments
     ORDER BY checked_at DESC
     LIMIT ${Math.max(1, Math.min(500, Number(limit) || 200))}`
  );
};

export const getSupplierRiskStatus = async (supplierId: string) => {
  await ensureEudrRiskStorage();
  return prisma.$queryRaw<Array<any>>`
    SELECT DISTINCT ON (source_type, COALESCE(source_id, farm_name, coordinates))
           assessment_id, supplier_id, supplier_name, source_type, source_id, farm_name, farm_location,
           coordinates, risk_level, risk_score, nearest_area_name, nearest_distance_km,
           data_source, assessment_notes, checked_at
    FROM deforestation_risk_assessments
    WHERE supplier_id = ${supplierId}
    ORDER BY source_type, COALESCE(source_id, farm_name, coordinates), checked_at DESC
  `;
};

export const updateBatchDeforestationRisk = async (
  batchId: string,
  risk: { riskLevel: EudrRiskLevel; riskScore: number },
) => {
  await ensureEudrRiskStorage();
  await prisma.$executeRaw`
    UPDATE coffee_batches
    SET deforestation_risk_level = ${risk.riskLevel},
        deforestation_risk_score = ${risk.riskScore},
        deforestation_checked_at = NOW()
    WHERE batch_id = ${batchId}
  `;
};
