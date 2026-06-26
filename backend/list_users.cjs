
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
(async()=>{
 const users = await prisma.user.findMany({ include:{role:true}, orderBy:{createdAt:'desc'}, take:80 });
 console.log(JSON.stringify(users.map(u=>({email:u.email, name:u.fullName, role:u.role.roleName, status:u.status, mfa:u.mfaEnabled})), null, 2));
 await prisma.$disconnect();
})().catch(async e=>{console.error(e); await prisma.$disconnect(); process.exit(1)});
