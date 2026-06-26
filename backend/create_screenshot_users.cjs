
const { PrismaClient } = require('./node_modules/@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();
(async()=>{
 const passwordHash = await bcrypt.hash('Screenshot@123', 10);
 const roles = await prisma.role.findMany();
 const roleId = Object.fromEntries(roles.map(r=>[r.roleName,r.roleId]));
 const users = [
  ['screenshot.farmer@smartcoffee.rw','Screenshot Farmer','FARMER','+250780900001'],
  ['screenshot.aggregator@smartcoffee.rw','Screenshot Aggregator','AGGREGATOR','+250780900002'],
  ['screenshot.processor@smartcoffee.rw','Screenshot Processor','PROCESSOR','+250780900003'],
  ['screenshot.quality@smartcoffee.rw','Screenshot Quality Controller','QUALITY_CONTROLLER','+250780900004'],
  ['screenshot.logistics@smartcoffee.rw','Screenshot Logistics Coordinator','LOGISTICS','+250780900005'],
  ['screenshot.exporter@smartcoffee.rw','Screenshot Exporter','EXPORTER','+250780900006'],
  ['screenshot.admin@smartcoffee.rw','Screenshot Admin','ADMIN','+250780900007']
 ];
 const created = {};
 for (const [email, fullName, roleName, phone] of users) {
   created[email] = await prisma.user.upsert({
    where:{email},
    update:{fullName, phone, roleId:roleId[roleName], passwordHash, status:'active', mfaEnabled:false},
    create:{email, fullName, phone, roleId:roleId[roleName], passwordHash, status:'active', mfaEnabled:false}
   });
 }
 let coop = await prisma.cooperative.findFirst({ where:{name:'Screenshot Coffee Cooperative'} });
 if (!coop) {
   coop = await prisma.cooperative.create({ data:{ name:'Screenshot Coffee Cooperative', district:'Kigali City, Gasabo, Kimironko, Kibagabaga', zone:'Kimironko Collection Point', managerId:created['screenshot.aggregator@smartcoffee.rw'].userId, status:'active' } });
 }
 await prisma.cooperativeAggregator.upsert({
   where:{ coopId_userId:{ coopId:coop.coopId, userId:created['screenshot.aggregator@smartcoffee.rw'].userId } },
   update:{ isPrimary:true },
   create:{ coopId:coop.coopId, userId:created['screenshot.aggregator@smartcoffee.rw'].userId, isPrimary:true }
 });
 await prisma.farmerProfile.upsert({
   where:{ userId:created['screenshot.farmer@smartcoffee.rw'].userId },
   update:{ farmName:'Screenshot Demonstration Farm', farmSizeHa:5, gpsLocation:'Kigali City, Gasabo, Kimironko, Kibagabaga', coordinates:'-1.933775, 30.132433', aggregatorId:created['screenshot.aggregator@smartcoffee.rw'].userId, cooperativeId:coop.coopId, status:'approved' },
   create:{ userId:created['screenshot.farmer@smartcoffee.rw'].userId, farmName:'Screenshot Demonstration Farm', farmSizeHa:5, gpsLocation:'Kigali City, Gasabo, Kimironko, Kibagabaga', coordinates:'-1.933775, 30.132433', aggregatorId:created['screenshot.aggregator@smartcoffee.rw'].userId, cooperativeId:coop.coopId, status:'approved' }
 });
 console.log('created screenshot users password Screenshot@123');
 await prisma.$disconnect();
})().catch(async e=>{console.error(e); await prisma.$disconnect(); process.exit(1)});
