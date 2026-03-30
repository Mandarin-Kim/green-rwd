import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const module = searchParams.get('module') || ''
    const studyCode = searchParams.get('study') || ''

    let study = null
    if (studyCode) {
      study = await prisma.study.findUnique({ where: { code: studyCode } })
    }
    if (!study) {
      study = await prisma.study.findFirst({ orderBy: { createdAt: 'asc' } })
    }

    if (!study) {
      return NextResponse.json({ error: 'No study found' }, { status: 404 })
    }

    const studies = await prisma.study.findMany({
      select: { id: true, code: true, name: true, phase: true },
      orderBy: { code: 'asc' }
    })

    let moduleData: unknown = null

    switch (module) {
      case 'edc':
        moduleData = await prisma.eDCForm.findMany({
          where: { studyId: study.id },
          orderBy: { formName: 'asc' }
        })
        break

      case 'ctms':
        const [sites, milestones] = await Promise.all([
          prisma.cTMSSite.findMany({ where: { studyId: study.id } }),
          prisma.cTMSMilestone.findMany({
            where: { studyId: study.id },
            orderBy: { dueDate: 'asc' }
          })
        ])
        moduleData = { sites, milestones }
        break

      case 'iwrs':
        moduleData = await prisma.iWRSAssignment.findMany({
          where: { studyId: study.id },
          include: { subject: { select: { screeningId: true, name: true } } },
          orderBy: { date: 'desc' }
        })
        break

      case 'safety':
        const [saeReports, aeSummaries] = await Promise.all([
          prisma.sAEReport.findMany({
            where: { studyId: study.id },
            include: { subject: { select: { screeningId: true } } },
            orderBy: { reportDate: 'desc' }
          }),
          prisma.aESummary.findMany({
            where: { studyId: study.id },
            orderBy: { total: 'desc' }
          })
        ])
        moduleData = { saeReports, aeSummaries }
        break

      case 'etmf':
        moduleData = await prisma.eTMFDocument.findMany({
          where: { studyId: study.id },
          orderBy: { date: 'desc' }
        })
        break

      case 'econsent':
        const tab = searchParams.get('tab') || 'forms'
        if (tab === 'forms') {
          moduleData = await prisma.eConsentForm.findMany({
            where: { studyId: study.id }
          })
        } else {
          moduleData = await prisma.eConsentRecord.findMany({
            where: { studyId: study.id },
            include: { subject: { select: { screeningId: true, name: true } } }
          })
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
    }

    return NextResponse.json({
      study,
      studies,
      data: moduleData
    })
  } catch (error) {
    console.error('eClinical GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { module, studyCode, data } = body

    const study = await prisma.study.findUnique({ where: { code: studyCode } })
    if (!study) {
      return NextResponse.json({ error: 'Study not found' }, { status: 404 })
    }

    let result: unknown = null

    switch (module) {
      case 'sae-report':
        result = await prisma.sAEReport.create({
          data: {
            studyId: study.id,
            subjectId: data.subjectId,
            site: data.site,
            event: data.event,
            severity: data.severity,
            relatedness: data.relatedness || null,
            reportDate: new Date(),
            status: 'open'
          }
        })
        break

      case 'etmf-upload':
        result = await prisma.eTMFDocument.create({
          data: {
            studyId: study.id,
            name: data.name,
            zone: data.zone,
            uploader: data.uploader || '본부장님',
            date: new Date(),
            size: data.size || '0KB'
          }
        })
        break

      case 'econsent-send':
        result = await prisma.eConsentRecord.create({
          data: {
            studyId: study.id,
            subjectId: data.subjectId,
            mainConsent: 'pending',
            genomicConsent: 'pending',
            biobankConsent: 'pending'
          }
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid module' }, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('eClinical POST Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}