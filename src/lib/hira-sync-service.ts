/**
 * HIRA 데이터 동기화 서비스
 * 12개 API 데이터를 DB에 캐싱하는 핵심 로직
 *
 * 사용 흐름:
 * 1. 관리자가 /api/hira/sync 호출 (또는 Vercel Cron 자동 실행)
 * 2. 각 API별 sync 함수가 HIRA API 호출 → DB 저장 (upsert)
 * 3. HiraSyncLog에 동기화 이력 기록
 * 4. 보고서 생성 시 DB에서 직접 조회 → 빠름
 */

import { PrismaClient } from '@prisma/client';

// ── API 모듈 import ──
import * as drugUsageApi from './hira-api';
import * as diseaseApi from './hira-disease-api';
import * as actionApi from './hira-action-api';
import * as feeApi from './hira-fee-api';
import * as hospitalApi from './hira-hospital-api';
import * as pharmacyApi from './hira-pharmacy-api';
import * as drugPriceApi from './hira-drugprice-api';
import * as ingredientApi from './hira-ingredient-api';
import * as drgApi from './hira-drg-api';
import * as ndrgApi from './hira-ndrg-api';
import * as nonPaymentApi from './hira-nonpayment-api';

const prisma = new PrismaClient();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 공통: 동기화 로그 관리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function startSyncLog(apiName: string, operation: string, params?: Record<string, unknown>) {
  return prisma.hiraSyncLog.create({
    data: {
      apiName,
      operation,
      status: 'SYNCING',
      params: params ? JSON.parse(JSON.stringify(params)) : undefined,
      startedAt: new Date(),
    },
  });
}

async function completeSyncLog(logId: string, recordCount: number) {
  return prisma.hiraSyncLog.update({
    where: { id: logId },
    data: { status: 'SUCCESS', recordCount, completedAt: new Date() },
  });
}

async function failSyncLog(logId: string, error: string) {
  return prisma.hiraSyncLog.update({
    where: { id: logId },
    data: { status: 'FAILED', errorMessage: error, completedAt: new Date() },
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. 의약품사용정보 동기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DrugUsageSyncParams {
  diagYm: string;               // 진료년월 (예: "202401")
  componentCodes?: string[];    // 특정 성분코드만 (미지정 시 전체)
}

export async function syncDrugUsage(params: DrugUsageSyncParams) {
  const { diagYm } = params;
  const log = await startSyncLog('drug-usage', 'all', { diagYm });

  try {
    // 12개 엔드포인트 중 핵심 6개를 순차 호출 (API 호출 한도 관리)
    const endpoints = [
      { fn: drugUsageApi.getCmpnSick, type: 'CMPN_SICK' },
      { fn: drugUsageApi.getCmpnArea, type: 'CMPN_AREA' },
      { fn: drugUsageApi.getCmpnCl, type: 'CMPN_CL' },
      { fn: drugUsageApi.getMeftDivSick, type: 'MEFT_SICK' },
      { fn: drugUsageApi.getMeftDivArea, type: 'MEFT_AREA' },
      { fn: drugUsageApi.getMeftDivCl, type: 'MEFT_CL' },
    ];

    let totalCount = 0;

    for (const ep of endpoints) {
      const { items } = await ep.fn(diagYm);

      for (const item of items) {
        await prisma.hiraDrugUsage.upsert({
          where: {
            diagYm_analysisType_componentCode_targetCode: {
              diagYm,
              analysisType: ep.type,
              componentCode: String(item.cmpnCd || item.meftDivNo || item.atcCd || ''),
              targetCode: String(item.sickCd || item.sidoSdCd || item.clCd || ''),
            },
          },
          create: {
            diagYm,
            analysisType: ep.type,
            componentCode: String(item.cmpnCd || item.meftDivNo || item.atcCd || ''),
            componentName: String(item.cmpnNm || item.meftDivNm || item.atcNm || ''),
            targetCode: String(item.sickCd || item.sidoSdCd || item.clCd || ''),
            targetName: String(item.sickNm || item.sidoSdNm || item.clCdNm || ''),
            usageAmount: Number(item.totUseCnt || item.usageQy || 0),
            usageRate: Number(item.totUseRt || 0),
            patientCount: Number(item.patntCnt || 0),
            claimAmount: BigInt(Number(item.trsRcptAmt || 0)),
          },
          update: {
            componentName: String(item.cmpnNm || item.meftDivNm || item.atcNm || ''),
            targetName: String(item.sickNm || item.sidoSdNm || item.clCdNm || ''),
            usageAmount: Number(item.totUseCnt || item.usageQy || 0),
            usageRate: Number(item.totUseRt || 0),
            patientCount: Number(item.patntCnt || 0),
            claimAmount: BigInt(Number(item.trsRcptAmt || 0)),
            syncedAt: new Date(),
          },
        });
        totalCount++;
      }
    }

    await completeSyncLog(log.id, totalCount);
    return { success: true, recordCount: totalCount };
  } catch (err) {
    await failSyncLog(log.id, String(err));
    return { success: false, error: String(err) };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. 질병정보 동기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function syncDiseaseInfo(sickCd: string, diagYm = '2024') {
  const log = await startSyncLog('disease-info', 'full', { sickCd, diagYm });

  try {
    const analysis = await diseaseApi.fetchDiseaseAnalysis(sickCd, diagYm);

    // 질병 기본정보 upsert
    await prisma.hiraDisease.upsert({
      where: { diseaseCode: sickCd },
      create: {
        diseaseCode: sickCd,
        diseaseName: analysis.diseaseName,
        patientCount: analysis.totalPatients,
      },
      update: {
        diseaseName: analysis.diseaseName,
        patientCount: analysis.totalPatients,
        syncedAt: new Date(),
      },
    });

    // 성별 통계
    for (const g of analysis.genderStats) {
      await prisma.hiraDiseaseGenderStats.upsert({
        where: {
          diseaseCode_period_gender: { diseaseCode: sickCd, period: diagYm, gender: g.gender },
        },
        create: {
          diseaseCode: sickCd, period: diagYm, gender: g.gender,
          inpatientCount: g.inpatientCount, outpatientCount: g.outpatientCount, totalCount: g.totalCount,
        },
        update: {
          inpatientCount: g.inpatientCount, outpatientCount: g.outpatientCount, totalCount: g.totalCount,
          syncedAt: new Date(),
        },
      });
    }

    // 연령대별 통계
    for (const a of analysis.ageDistribution) {
      await prisma.hiraDiseaseAgeStats.upsert({
        where: {
          diseaseCode_period_gender_ageGroup: {
            diseaseCode: sickCd, period: diagYm, gender: a.gender, ageGroup: a.ageGroup,
          },
        },
        create: {
          diseaseCode: sickCd, period: diagYm, gender: a.gender, ageGroup: a.ageGroup,
          patientCount: a.patientCount, visitCount: a.visitCount,
          claimAmount: BigInt(a.claimAmount),
        },
        update: {
          patientCount: a.patientCount, visitCount: a.visitCount,
          claimAmount: BigInt(a.claimAmount), syncedAt: new Date(),
        },
      });
    }

    // 의료기관종별 통계 (기존 연도별추이 API는 존재하지 않으므로 대체)
    // NOTE: yearTrend DB 테이블은 향후 다른 데이터 소스로 채울 수 있도록 유지

    // 지역별 통계
    for (const r of analysis.regionalStats) {
      await prisma.hiraDiseaseAreaStats.upsert({
        where: {
          diseaseCode_period_regionCode: { diseaseCode: sickCd, period: diagYm, regionCode: r.regionCode },
        },
        create: {
          diseaseCode: sickCd, period: diagYm, regionCode: r.regionCode, regionName: r.regionName,
          patientCount: r.patientCount, visitCount: r.visitCount,
          claimAmount: BigInt(r.claimAmount), patientRate: r.patientRate,
        },
        update: {
          regionName: r.regionName, patientCount: r.patientCount, visitCount: r.visitCount,
          claimAmount: BigInt(r.claimAmount), patientRate: r.patientRate, syncedAt: new Date(),
        },
      });
    }

    const total = analysis.genderStats.length + analysis.ageDistribution.length
      + analysis.institutionStats.length + analysis.regionalStats.length + 1;
    await completeSyncLog(log.id, total);
    return { success: true, recordCount: total };
  } catch (err) {
    await failSyncLog(log.id, String(err));
    return { success: false, error: String(err) };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. 병원정보 동기화 (시도별)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function syncHospitals(sidoCd?: string) {
  const log = await startSyncLog('hospital-info', 'getHospBasisList', { sidoCd });

  try {
    const hospitals = sidoCd
      ? await hospitalApi.getHospitalsByRegion(sidoCd)
      : await hospitalApi.getHospitalsByRegion('110000'); // 기본: 서울

    let count = 0;
    for (const h of hospitals) {
      await prisma.hiraHospital.upsert({
        where: { ykiho: h.ykiho },
        create: {
          ykiho: h.ykiho, hospitalName: h.hospitalName,
          classCode: h.classCode, className: h.className,
          sidoCode: h.sidoCode, sidoName: h.sidoName,
          sgguCode: h.sgguCode, sgguName: h.sgguName,
          address: h.address, phone: h.phone, website: h.website,
          establishDate: h.establishDate,
          doctorTotal: h.doctorTotal,
          mdSpecialist: h.mdSpecialistCount,
          dtSpecialist: h.dtSpecialistCount,
          cmSpecialist: h.cmSpecialistCount,
        },
        update: {
          hospitalName: h.hospitalName, className: h.className,
          sidoName: h.sidoName, sgguName: h.sgguName,
          address: h.address, phone: h.phone,
          doctorTotal: h.doctorTotal,
          mdSpecialist: h.mdSpecialistCount,
          dtSpecialist: h.dtSpecialistCount,
          cmSpecialist: h.cmSpecialistCount,
          syncedAt: new Date(),
        },
      });
      count++;
    }

    await completeSyncLog(log.id, count);
    return { success: true, recordCount: count };
  } catch (err) {
    await failSyncLog(log.id, String(err));
    return { success: false, error: String(err) };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. 약가정보 동기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function syncDrugPrices(productName: string) {
  const log = await startSyncLog('drug-price', 'getDgamtList', { productName });

  try {
    const products = await drugPriceApi.searchAllDrugPrices(productName);

    let count = 0;
    for (const p of products) {
      await prisma.hiraDrugPrice.upsert({
        where: {
          productCode_category: {
            productCode: p.productCode,
            category: p.category === '한방' ? 'ORIENTAL' : 'GENERAL',
          },
        },
        create: {
          productCode: p.productCode, productName: p.productName,
          manufacturer: p.manufacturer,
          category: p.category === '한방' ? 'ORIENTAL' : 'GENERAL',
          specification: p.specification, dosageRoute: p.dosageRoute,
          payType: p.payType, unitPrice: p.unitPrice, upperLimit: p.upperLimit,
          mainIngredientCode: p.mainIngredientCode, effectiveDate: p.effectiveDate,
        },
        update: {
          productName: p.productName, manufacturer: p.manufacturer,
          specification: p.specification, dosageRoute: p.dosageRoute,
          payType: p.payType, unitPrice: p.unitPrice, upperLimit: p.upperLimit,
          mainIngredientCode: p.mainIngredientCode, syncedAt: new Date(),
        },
      });
      count++;
    }

    await completeSyncLog(log.id, count);
    return { success: true, recordCount: count };
  } catch (err) {
    await failSyncLog(log.id, String(err));
    return { success: false, error: String(err) };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. 성분약효정보 동기화
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function syncIngredients(keyword: string) {
  const log = await startSyncLog('ingredient-info', 'getMajorCmpnNmCdList', { keyword });

  try {
    const ingredients = await ingredientApi.searchIngredientsByName(keyword);

    let count = 0;
    for (const i of ingredients) {
      await prisma.hiraIngredient.upsert({
        where: { generalNameCode: i.generalNameCode },
        create: {
          generalNameCode: i.generalNameCode, generalName: i.generalName,
          efficacyCode: i.efficacyClassCode, efficacyName: i.efficacyClassName,
          content: i.ingredientContent, dosageRoute: i.dosageRoute,
          formCode: i.formCode, formName: i.formName,
        },
        update: {
          generalName: i.generalName, efficacyName: i.efficacyClassName,
          content: i.ingredientContent, dosageRoute: i.dosageRoute,
          formName: i.formName, syncedAt: new Date(),
        },
      });
      count++;
    }

    await completeSyncLog(log.id, count);
    return { success: true, recordCount: count };
  } catch (err) {
    await failSyncLog(log.id, String(err));
    return { success: false, error: String(err) };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 마스터 동기화 (전체 API 한번에)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface MasterSyncParams {
  diagYm?: string;              // 의약품사용정보 기준월
  diseaseCodes?: string[];      // 동기화할 질병코드 목록
  drugNames?: string[];         // 동기화할 약품명 목록
  sidoCodes?: string[];         // 동기화할 시도코드 목록
}

export async function masterSync(params: MasterSyncParams = {}) {
  const results: Record<string, { success: boolean; recordCount?: number; error?: string }> = {};

  const diagYm = params.diagYm || '202401';

  // 1. 의약품 사용정보
  console.log('[SYNC] 의약품사용정보 시작...');
  results.drugUsage = await syncDrugUsage({ diagYm });

  // 2. 질병정보 (지정된 질병코드들)
  if (params.diseaseCodes?.length) {
    for (const code of params.diseaseCodes) {
      console.log(`[SYNC] 질병정보 ${code} 시작...`);
      results[`disease_${code}`] = await syncDiseaseInfo(code);
    }
  }

  // 3. 병원정보 (지정된 시도들)
  const regions = params.sidoCodes || ['110000']; // 기본: 서울
  for (const sido of regions) {
    console.log(`[SYNC] 병원정보 ${sido} 시작...`);
    results[`hospital_${sido}`] = await syncHospitals(sido);
  }

  // 4. 약가정보 (지정된 약품명들)
  if (params.drugNames?.length) {
    for (const name of params.drugNames) {
      console.log(`[SYNC] 약가정보 "${name}" 시작...`);
      results[`drugPrice_${name}`] = await syncDrugPrices(name);
    }
  }

  console.log('[SYNC] 전체 동기화 완료');
  return results;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 동기화 상태 조회
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getSyncStatus() {
  const logs = await prisma.hiraSyncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // API별 최신 동기화 상태
  const latestByApi = new Map<string, typeof logs[0]>();
  for (const log of logs) {
    const key = `${log.apiName}:${log.operation}`;
    if (!latestByApi.has(key)) latestByApi.set(key, log);
  }

  return {
    recentLogs: logs.slice(0, 20),
    latestByApi: Object.fromEntries(latestByApi),
    summary: {
      total: logs.length,
      success: logs.filter(l => l.status === 'SUCCESS').length,
      failed: logs.filter(l => l.status === 'FAILED').length,
      syncing: logs.filter(l => l.status === 'SYNCING').length,
    },
  };
}
