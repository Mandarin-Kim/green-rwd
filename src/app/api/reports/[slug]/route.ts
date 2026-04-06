import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reports/[slug] — slug로 개별 카탈로그 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const catalog = await prisma.reportCatalog.findUnique({
      where: { slug },
    });

    if (!catalog) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: catalog.id,
      slug: catalog.slug,
      title: catalog.title,
      description: catalog.description,
      categories: catalog.categories,
      therapeuticArea: catalog.therapeuticArea,
      drugName: catalog.drugName,
      indication: catalog.indication,
      region: catalog.region,
      marketSizeKrw: Number(catalog.marketSizeKrw),
      patientPool: catalog.patientPool,
      priceBasic: catalog.priceBasic,
      pricePro: catalog.pricePro,
      pricePremium: catalog.pricePremium,
      sampleUrl: catalog.sampleUrl,
      thumbnailUrl: catalog.thumbnailUrl,
    });
  } catch (error) {
    console.error('Report slug API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
