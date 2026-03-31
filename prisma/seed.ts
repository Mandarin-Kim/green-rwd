import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  await prisma.user.deleteMany({})
  const admin = await prisma.user.create({
    data: {
      email: 'admin@green.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'ADMIN',
    },
  })
  const manager = await prisma.user.create({
    data: {
      email: 'manager@green.com',
      password: await bcrypt.hash('manager123', 10),
      name: 'Manager User',
      role: 'MANAGER',
    },
  })
  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@green.com',
      password: await bcrypt.hash('viewer123', 10),
      name: 'Viewer User',
      role: 'VIEWER',
    },
  })
  const researcher = await prisma.user.create({
    data: {
      email: 'researcher@green.com',
      password: await bcrypt.hash('researcher123', 10),
      name: 'Researcher',
      role: 'RESEARCHER',
    },
  })
  console.log(`Created users: ${admin.email}, ${manager.email}, ${viewer.email}, ${researcher.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
