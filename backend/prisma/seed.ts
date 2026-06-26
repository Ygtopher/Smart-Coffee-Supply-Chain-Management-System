import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/config/rolePermissions';

const prisma = new PrismaClient();
const buildAssignmentId = () => `CA-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Roles
  const roles = [
    'ADMIN',
    'FARMER',
    'AGGREGATOR',
    'PROCESSOR',
    'QUALITY_CONTROLLER',
    'LOGISTICS',
    'EXPORTER'
  ];

  for (const roleName of roles) {
    await prisma.role.upsert({
      where: { roleName },
      update: {
        permissions: DEFAULT_ROLE_PERMISSIONS[roleName]
      },
      create: {
        roleName,
        permissions: DEFAULT_ROLE_PERMISSIONS[roleName]
      }
    });
  }
  console.log('✅ Roles seeded');

  // 2. Helper to get role ID
  async function getRoleId(name: string): Promise<string> {
    const role = await prisma.role.findUnique({ where: { roleName: name } });
    if (!role) throw new Error(`Role ${name} not found`);
    return role.roleId;
  }

  // 3. Delete all data to ensure clean slate (except admin user)
  await prisma.farmerProfile.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.paymentTransaction.deleteMany({});
  await prisma.deliveryRecord.deleteMany({});
  await prisma.sustainabilityMetric.deleteMany({});
  await prisma.cooperative.deleteMany({});
  
  await prisma.user.deleteMany({
    where: {
      email: {
        not: 'admin@smartcoffee.rw'
      }
    }
  });
  console.log('  🗑️ Cleared old demo users and profiles');

  // 4. Create the super admin
  const adminRoleId = await getRoleId('ADMIN');
  const adminHash = await bcrypt.hash('Admin@123', 10);
  
  await prisma.user.upsert({
    where: { email: 'admin@smartcoffee.rw' },
    update: {
      passwordHash: adminHash,
      fullName: 'Super Administrator'
    },
    create: {
      email: 'admin@smartcoffee.rw',
      passwordHash: adminHash,
      fullName: 'Super Administrator',
      phone: '+250780000000',
      roleId: adminRoleId,
      status: 'active',
      mfaEnabled: false,
    }
  });
  console.log('  ✅ ADMIN: admin@smartcoffee.rw (Admin@123)');

  // 5. Create demo cooperative aggregators and cooperatives
  const aggregatorRoleId = await getRoleId('AGGREGATOR');
  const demoHash = await bcrypt.hash('Password@123', 10);
  const demoAggregators = [
    { email: 'nyamirambo.coop@smartcoffee.rw', fullName: 'Nyamirambo Cooperative Manager', phone: '+250781000001' },
    { email: 'huye.cws@smartcoffee.rw', fullName: 'Huye CWS Cooperative Manager', phone: '+250781000002' },
    { email: 'rulindo.coffee@smartcoffee.rw', fullName: 'Rulindo Coffee Cooperative Manager', phone: '+250781000003' },
  ];
  const aggregatorUsers = [];
  for (const user of demoAggregators) {
    aggregatorUsers.push(await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash: demoHash, roleId: aggregatorRoleId, status: 'active' },
      create: { ...user, passwordHash: demoHash, roleId: aggregatorRoleId, status: 'active', mfaEnabled: false },
    }));
  }

  const demoCooperatives = [
    { name: 'Nyamirambo Coffee Cooperative', district: 'Kigali City, Nyarugenge, Nyamirambo', zone: 'Nyamirambo Collection Point', managerId: aggregatorUsers[0].userId },
    { name: 'Huye Mountain Coffee Cooperative', district: 'Southern Province, Huye, Tumba', zone: 'Tumba Collection Point', managerId: aggregatorUsers[1].userId },
    { name: 'Rulindo Specialty Coffee Cooperative', district: 'Northern Province, Rulindo, Base', zone: 'Base Collection Point', managerId: aggregatorUsers[2].userId },
  ];
  for (const coop of demoCooperatives) {
    const existing = await prisma.cooperative.findFirst({ where: { name: coop.name } });
    if (existing) {
      const updated = await prisma.cooperative.update({ where: { coopId: existing.coopId }, data: { ...coop, status: 'active' } });
      await prisma.$executeRaw`
        INSERT INTO cooperative_aggregators (assignment_id, coop_id, user_id, is_primary)
        VALUES (${buildAssignmentId()}, ${updated.coopId}, ${coop.managerId}, true)
        ON CONFLICT (coop_id, user_id)
        DO UPDATE SET is_primary = true
      `;
    } else {
      const created = await prisma.cooperative.create({ data: { ...coop, status: 'active' } });
      await prisma.$executeRaw`
        INSERT INTO cooperative_aggregators (assignment_id, coop_id, user_id, is_primary)
        VALUES (${buildAssignmentId()}, ${created.coopId}, ${coop.managerId}, true)
        ON CONFLICT (coop_id, user_id)
        DO UPDATE SET is_primary = true
      `;
    }
  }
  console.log('  Demo cooperatives created');

  // 6. Create a warehouse location for processor use
  await prisma.warehouseLocation.upsert({
    where: { locationId: 'wh-default' },
    update: {},
    create: {
      locationId: 'wh-default',
      name: 'Nyamasheke Warehouse',
      type: 'Warehouse',
      address: 'Nyamasheke, Western Province',
      district: 'Nyamasheke',
      capacityKg: 50000,
      status: 'active',
    }
  });
  console.log('  ✅ Default warehouse created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 All demo accounts use password: Password@123');
  console.log('📋 Super admin: admin@smartcoffee.rw / Admin@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
