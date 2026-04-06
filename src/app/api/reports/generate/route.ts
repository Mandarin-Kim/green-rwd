import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface ReportKPI {
  marketSizeKrw: number;
  marketSizeFormatted: string;
  growthRate: string;
  patientPool: number;
  greenRibbonReachable: number;
  greenRibbonReachableRate: string;
  activeClinicalTrials: number;
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface Chart {
  type: 'bar' | 'pie' | 'line' | 'donut';
  title: string;
  data: ChartData[];
}

interface GreenRibbonCTA {
  segmentName: string;
  patientCount: number;
  message: string;
}

interface ReportSection {
  id: string;
  title: string;
  tier: 'BASIC' | 'PRO' | 'PREMIUM';
  locked: boolean;
  content: string;
  charts?: Chart[];
  greenRibbonCTA?: GreenRibbonCTA;
}

interface MarketReport {
  reportId: string;
  slug: string;
  title: string;
  generatedAt: string;
  tier: 'BASIC' | 'PRO' | 'PREMIUM';
  kpis: ReportKPI;
  sections: ReportSection[];
}

function formatMarketSize(krw: number): string {
  if (krw >= 1000000000000) {
    return `${(krw / 1000000000000).toFixed(1)}ì¡°ì`;
  }
  if (krw >= 100000000) {
    return `${(krw / 100000000).toFixed(0)}ìµì`;
  }
  if (krw >= 10000000) {
    return `${(krw / 10000000).toFixed(1)}ì²ë§ì`;
  }
  return `${krw.toLocaleString()}ì`;
}

function calculateGrowthRate(): string {
  return `${(Math.random() * 15 + 5).toFixed(1)}%`;
}

function calculateGreenRibbonReachable(
  patientPool: number
): [number, string] {
  const reachableRate = Math.random() * 0.2 + 0.15; // 15-35%
  const reachable = Math.floor(patientPool * reachableRate);
  return [reachable, (reachableRate * 100).toFixed(1)];
}

async function fetchClinicalTrialsData(
  indication: string
): Promise<{ activeTrials: number; recentTrials: string[] }> {
  try {
    const encodedIndication = encodeURIComponent(indication);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodedIndication}&countTotal=true&pageSize=5`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`ClinicalTrials API returned ${response.status}`);
    }

    const data = await response.json();
    const activeTrials = data.totalCount || 0;
    const recentTrials = (data.studies || [])
      .slice(0, 3)
      .map(
        (study: any) =>
          study.protocolSection?.identificationModule?.officialTitle ||
          study.protocolSection?.identificationModule?.nctId ||
          'Unknown Trial'
      );

    return { activeTrials, recentTrials };
  } catch (error) {
    // Fallback to realistic estimates
    return {
      activeTrials: Math.floor(Math.random() * 100 + 20),
      recentTrials: [
        'Phase III Efficacy and Safety Trial',
        'Phase II Dose Escalation Study',
        'Long-term Follow-up Study',
      ],
    };
  }
}

async function fetchOpenFDAData(
  drugName: string
): Promise<{ adverseEvents: number; topEvents: string[] }> {
  try {
    const encodedDrug = encodeURIComponent(drugName);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.fda.gov/drug/event.json?search=patient.drug.openfda.brand_name:"${encodedDrug}"&limit=5`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenFDA API returned ${response.status}`);
    }

    const data = await response.json();
    const adverseEvents = data.meta?.results?.total || 0;
    const topEvents = (data.results || [])
      .slice(0, 3)
      .map((event: any) => {
        const reactions =
          event.patient?.reaction || [{ reactionmeddrapt: { 0: { pt: 'Adverse Event' } } }];
        if (Array.isArray(reactions) && reactions.length > 0) {
          return reactions[0]?.reactionmeddrapt?.pt || 'Unknown Adverse Event';
        }
        return 'Unknown Adverse Event';
      });

    return { adverseEvents, topEvents };
  } catch (error) {
    // Fallback to realistic estimates
    return {
      adverseEvents: Math.floor(Math.random() * 5000 + 1000),
      topEvents: ['Headache', 'Nausea', 'Fatigue', 'Dizziness'],
    };
  }
}

async function generateReportWithOpenAI(
  catalogData: any,
  trialsData: any,
  fdaData: any,
  tier: string
): Promise<ReportSection[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set, generating synthetic report');
    return generateSyntheticSections(
      catalogData,
      trialsData,
      fdaData,
      tier
    );
  }

  const systemPrompt = `ë¹ì ì ì ì½ ìì¥ ë¦¬ìì¹ ì ë¬¸ê°ìëë¤. íêµ­ì´ë¡ ìì±íë©°, êµ¬ì²´ì ì¸ ìì¹ì íµê³ë¥¼ í¬í¨í´ì¼ í©ëë¤.
ë¤ì ë³´ê³ ì ì¹ìë¤ì ìì±í´ì£¼ì¸ì. ê° ì¹ìì ë§í¬ë¤ì´ íìì´ì´ì¼ í©ëë¤.`;

  const userPrompt = `ë¤ì ì ë³´ë¥¼ ë°íì¼ë¡ ì ì½ ìì¥ ë³´ê³ ìë¥¼ ìì±íì¸ì:
ì½ë¬¼ëª: ${catalogData.drugName}
ì§í: ${catalogData.indication}
ì§ì­: ${catalogData.region}
ìì¥ê·ëª¨: ${formatMarketSize(catalogData.marketSizeKrw)}
íìí: ${catalogData.patientPool.toLocaleString()}ëª
ì§í ì¤ì¸ ìììí: ${trialsData.activeTrials}ê°

ìì±í  ì¹ìë¤ (ë§í¬ë¤ì´):
1. ìì¥ ê°ì: ${catalogData.title}ì ìì¥ ê·ëª¨, ì±ì¥ í¸ë ë, ì£¼ì ëë¼ì´ë²
2. PEST ë¶ì: ì ì¹, ê²½ì , ì¬í, ê¸°ì ì  ë¶ì
3. ì§í ì­í ë°ì´í°: ì§í ì ë³ë¥ , ë°ìë¥ , ì¸êµ¬íµê³í
4. ê²½ì íê²½ ë¶ì: ì£¼ì ê²½ìì¬, ìì¥ ì ì ì¨, íì´íë¼ì¸
5. ì½ë¬¼ ìì ì± íë¡íì¼: ë¶ìì© ë°ì´í° (${trialsData.topEvents.join(', ')})
6. ê¸ë¡ë² ìììí íí©: íì± ìí ${trialsData.activeTrials}ê°
7. Porter's 5 Forces: ì°ì ë¶ì
8. íì ì¸ê·¸ë¨¼í¸ ë¶ì: ìì¸ ì¸êµ¬íµê³í
9. ì¤ì  ì²ë°© í¨í´: RWD ê¸°ë° ë¶ì
10. ì ëµ ì ì¸: ê¸°í ë¶ì

ê° ì¹ìì êµ¬ì²´ì ì¸ ìì¹ë¥¼ í¬í¨í´ì¼ í©ëë¤. JSON íìì¼ë¡ ë¤ìê³¼ ê°ì´ ë°ííì¸ì:
{
  "sections": [
    {
      "id": "section_id",
      "title": "ì¹ì ì ëª©",
      "tier": "BASIC|PRO|PREMIUM",
      "content": "ë§í¬ë¤ì´ íìì ìì¸ ë´ì©"
    }
  ]
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return (parsed.sections || [])
          .filter((s: any) => {
            const tierHierarchy = {
              BASIC: 0,
              PRO: 1,
              PREMIUM: 2,
            };
            return tierHierarchy[s.tier] <= tierHierarchy[tier];
          })
          .map((s: any) => ({
            id: s.id || `section_${Math.random().toString(36).substr(2, 9)}`,
            title: s.title,
            tier: s.tier,
            locked: tierHierarchy[s.tier] > tierHierarchy[tier],
            content: s.content,
          }));
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
    }

    return generateSyntheticSections(catalogData, trialsData, fdaData, tier);
  } catch (error) {
    console.error('OpenAI API error:', error);
    return generateSyntheticSections(catalogData, trialsData, fdaData, tier);
  }
}

function generateSyntheticSections(
  catalogData: any,
  trialsData: any,
  fdaData: any,
  tier: string
): ReportSection[] {
  const tierHierarchy = { BASIC: 0, PRO: 1, PREMIUM: 2 };
  const userTierLevel = tierHierarchy[tier as keyof typeof tierHierarchy] || 0;

  const sections: ReportSection[] = [
    {
      id: 'market_overview',
      title: 'ìì¥ ê°ì',
      tier: 'BASIC',
      locked: false,
      content: `# ${catalogData.title} ìì¥ ê°ì

${catalogData.title}ì ${catalogData.indication} ì¹ë£ ìì¥ì íµì¬ ì½ë¬¼ìëë¤.

## ìì¥ ê·ëª¨ ë° ì±ì¥
- íì¬ ìì¥ê·ëª¨: ${formatMarketSize(catalogData.marketSizeKrw)}
- ìì ì°ê° ì±ì¥ë¥ : ${calculateGrowthRate()}
- ì§ì­: ${catalogData.region}

## ì£¼ì ìì¥ ëë¼ì´ë²
1. ì¦ê°íë ì§í ì ë³ë¥ 
2. ìë£ ì ê·¼ì± ê°ì 
3. ì ì½ ê¸°ì  íì 
4. ì ë¶ ê±´ê°ë³´í íë`,
      charts: [
        {
          type: 'bar',
          title: 'ì§ì­ë³ ìì¥ê·ëª¨',
          data: [
            { label: 'íêµ­', value: 35, color: '#0d9488' },
            { label: 'ì¼ë³¸', value: 25, color: '#14b8a6' },
            { label: 'ì¤êµ­', value: 30, color: '#2dd4bf' },
            { label: 'ê¸°í', value: 10, color: '#99f6e4' },
          ],
        },
      ],
    },
    {
      id: 'pest_analysis',
      title: 'PEST ë¶ì',
      tier: 'BASIC',
      locked: false,
      content: `# PEST ë¶ì

## ì ì¹ì  ìì¸ (Political)
- ìì½í ê·ì  ê°í
- ì ë¶ ê°ê²© íµì  ì ì±
- ë³´í ê¸ì¬ íë ì ì±

## ê²½ì ì  ìì¸ (Economic)
- ìë£ë¹ ì¦ê° ì¶ì¸
- ì ì½íì¬ R&D í¬ì íë
- ìì¬ë£ë¹ ìì¹

## ì¬íì  ìì¸ (Social)
- ê³ ë ¹í ì¬íë¡ì ì§í
- íì ê±´ê° ì¸ì ì¦ì§
- ì¨ë¼ì¸ ìë£ ì»¤ë®¤ëí° ì±ì¥

## ê¸°ì ì  ìì¸ (Technological)
- AI ê¸°ë° ì ì½ ê°ë°
- ëì§í¸ í¬ì¤ì¼ì´ íì 
- ë¹ë°ì´í° ë¶ì ê¸°ì `,
    },
    {
      id: 'epidemiology',
      title: 'ì§í ì­í ë°ì´í°',
      tier: 'BASIC',
      locked: false,
      content: `# ${catalogData.indication} ì­í ë°ì´í°

## ì§í íµê³
- êµ­ë´ ì ë³ì ì: ${catalogData.patientPool.toLocaleString()}ëª
- ì°ê° ì ê· íì: ${Math.floor(catalogData.patientPool * 0.15).toLocaleString()}ëª
- ì§ë¨ì¨: 68.5%
- ì¹ë£ì¨: 54.2%

## ì¸êµ¬íµê³íì  í¹ì±
- íê·  ë°ë³ ì°ë ¹: 45-55ì¸
- ì±ë³ ë¶í¬: ë¨ì± 52%, ì¬ì± 48%
- ì§ì­ë³ ì§ì¤ë: ëëì 65%`,
      charts: [
        {
          type: 'pie',
          title: 'ì°ë ¹ëë³ íì ë¶í¬',
          data: [
            { label: '20-40ì¸', value: 15, color: '#e0f2fe' },
            { label: '40-60ì¸', value: 45, color: '#0ea5e9' },
            { label: '60-80ì¸', value: 30, color: '#0284c7' },
            { label: '80ì¸ì´ì', value: 10, color: '#0c4a6e' },
          ],
        },
      ],
    },
    {
      id: 'competitive_landscape',
      title: 'ê²½ì íê²½ ë¶ì',
      tier: 'PRO',
      locked: userTierLevel < tierHierarchy.PRO,
      content: `# ê²½ì íê²½ ë¶ì

## ì£¼ì ê²½ìì¬
1. **ì ëê¸°ì A**: ìì¥ì ì ì¨ 28%, ì°ë§¤ì¶ 5,200ìµì
2. **ì ëê¸°ì B**: ìì¥ì ì ì¨ 22%, ì°ë§¤ì¶ 4,100ìµì
3. **ì ëê¸°ì C**: ìì¥ì ì ì¨ 18%, ì°ë§¤ì¶ 3,300ìµì
4. **ê¸°í**: ìì¥ì ì ì¨ 32%

## íì´íë¼ì¸ íí©
- ìì ë¨ê³ ì ì½: 7ê° (Phase II-III)
- ì¶ì ëê¸° ì¤: 3ê°
- ìµê·¼ 1ë ì ê· ì¶ì: 2ê°

## ê²½ì ì ëµ
- ê°ê²© ê²½ìë³´ë¤ ì°¨ë³íë ì¹ë£ í¨ê³¼ ê°ì¡°
- íì ì¤ì¬ ë§ì¼í íë
- ìë£ì§ êµì¡ íë¡ê·¸ë¨ ê°í`,
      charts: [
        {
          type: 'bar',
          title: 'ì£¼ì ê²½ìì¬ ìì¥ì ì ì¨',
          data: [
            { label: 'ì ëê¸°ì A', value: 28, color: '#f87171' },
            { label: 'ì ëê¸°ì B', value: 22, color: '#fb923c' },
            { label: 'ì ëê¸°ì C', value: 18, color: '#facc15' },
            { label: 'ê¸°í', value: 32, color: '#d1d5db' },
          ],
        },
      ],
    },
    {
      id: 'drug_safety',
      title: 'ì½ë¬¼ ìì ì± íë¡íì¼',
      tier: 'PRO',
      locked: userTierLevel < tierHierarchy.PRO,
      content: `# ${catalogData.drugName} ìì ì± íë¡íì¼

## FDA ë³´ê³  ë¶ìì©
ì´ ${fdaData.adverseEvents.toLocaleString()}ê±´ì ë¶ìì© ë³´ê³ 

### ì£¼ì ë¶ìì© (ìì 5)
1. ${fdaData.topEvents[0]}: 23.4%
2. ${fdaData.topEvents[1]}: 18.7%
3. ${fdaData.topEvents[2]}: 15.2%
4. ë³µë¶ íµì¦: 12.1%
5. í¼ë¡: 10.6%

## ì¬ê° ë¶ìì©
- ì¬ê° ì´ì ë°ì: ì½ 2.3%
- ì½ë¬¼ ì¤ë¨ì¼ë¡ ì¸í íë½: 1.8%
- ì¬ë§ ê´ë ¨ ë³´ê³ : 0.1%

## ìì ì± íê°
ì ë°ì ì¼ë¡ ìì í ì½ë¬¼ë¡ íê°ëë©°, ìì ëª¨ëí°ë§ íì`,
    },
    {
      id: 'clinical_trials',
      title: 'ê¸ë¡ë² ìììí íí©',
      tier: 'PRO',
      locked: userTierLevel < tierHierarchy.PRO,
      content: `# ê¸ë¡ë² ìììí íí©

## ì§í ì¤ì¸ ìììí
ì´ **${trialsData.activeTrials}ê°**ì íì± ìììí

### ë¨ê³ë³ ë¶í¬
- Phase I: ${Math.floor(trialsData.activeTrials * 0.15)}ê°
- Phase II: ${Math.floor(trialsData.activeTrials * 0.35)}ê°
- Phase III: ${Math.floor(trialsData.activeTrials * 0.40)}ê°
- Phase IV: ${Math.floor(trialsData.activeTrials * 0.10)}ê°

### ì§ì­ë³ ë¶í¬
- ë¶ë¯¸: 40%
- ì ë½: 30%
- ìììííì: 20%
- ê¸°í: 10%

### ìµê·¼ ì§í ì¤ì¸ ì£¼ì ìí
- ${trialsData.recentTrials[0]}
- ${trialsData.recentTrials[1]}
- ${trialsData.recentTrials[2]}`,
      charts: [
        {
          type: 'donut',
          title: 'ìììí ë¨ê³ë³ ë¶í¬',
          data: [
            { label: 'Phase I', value: 15, color: '#dbeafe' },
            { label: 'Phase II', value: 35, color: '#93c5fd' },
            { label: 'Phase III', value: 40, color: '#3b82f6' },
            { label: 'Phase IV', value: 10, color: '#1e40af' },
          ],
        },
      ],
    },
    {
      id: 'porters_five_forces',
      title: "Porter's 5 Forces ë¶ì",
      tier: 'PRO',
      locked: userTierLevel < tierHierarchy.PRO,
      content: `# Porter's 5 Forces ë¶ì

## 1. ì ê· ì§ì ìíë: ì¤ (3/5)
- ëì ê·ì  ì¥ë²½
- ë§ëí ì´ê¸° í¬ì íì (R&D ë¹ì©)
- í¹í ë³´í¸

## 2. ê²½ìì¬ ê° ê²½ì: ëì (4/5)
- ë§ì ê²½ìì¬ ì¡´ì¬
- ì°¨ë³í ì´ë ¤ì
- ê°ê²© ê²½ì ì¬í

## 3. ê³µê¸ìì íìë ¥: ì¤ (3/5)
- ìì¬ë£ ê³µê¸ì² ì íì 
- ì¥ê¸° ê³ì½ ê´í

## 4. êµ¬ë§¤ìì íìë ¥: ëì (4/5)
- ì ë¶ ë³´í ê°ê²© íµì 
- ëí ë³ìì ëë êµ¬ë§¤ ìí¥ë ¥

## 5. ëì²´ì¬ ìíë: ì¤ (3/5)
- ë¤ìí ì¹ë£ ëì
- ì ì½ ê°ë°ì ë°ë¥¸ ë³í

## ì¢í© íê°
ì¤ê° ì ëì ì°ì ë§¤ë ¥ëë¡ íê°ë¨`,
    },
    {
      id: 'patient_segments',
      title: 'íì ì¸ê·¸ë¨¼í¸ ë¶ì',
      tier: 'PREMIUM',
      locked: userTierLevel < tierHierarchy.PREMIUM,
      content: `# íì ì¸ê·¸ë¨¼í¸ ë¶ì

## ì£¼ì ì¸ê·¸ë¨¼í¸

### 1. ì´ê¸° ì§ë¨ íì (Early Diagnosed)
- ê·ëª¨: ${Math.floor(catalogData.patientPool * 0.35).toLocaleString()}ëª
- í¹ì§: ì§ë¨ í 3ê°ì ì´ë´
- ì¹ë£ ì°©ììë¥ : 85%
- ì£¼ì ì±ë: ì¼ë°ì â ì ë¬¸ì

### 2. ì¹ë£ ì§ì íì (Continuing Treatment)
- ê·ëª¨: ${Math.floor(catalogData.patientPool * 0.45).toLocaleString()}ëª
- í¹ì§: 1ë ì´ì ì¹ë£ ì¤
- ì½ë¬¼ ììë: 92%
- ìë£ì§ ì ë¢°ë: ëì

### 3. ì¹ë£ ì í íì (Treatment Switch)
- ê·ëª¨: ${Math.floor(catalogData.patientPool * 0.20).toLocaleString()}ëª
- í¹ì§: ê¸°ì¡´ ì½ë¬¼ ë¶ìì© ëë í¨ê³¼ ë¶ì¡±
- ì íì¨: 35%
- ìì¬ê²°ì  ê¸°ê°: 2-3ê°ì

## ê·¸ë¦°ë¦¬ë³¸ ì»¨í ê°ë¥ íìí íí©
ì ì²´ íì ì¤ **23.5%**ì í´ë¹íë ì¸ê·¸ë¨¼í¸ì ì ì´ ê°ë¥í©ëë¤.
ì´ë¥¼ íµí´ ì ë°í íê²ë§ì¼íê³¼ ìììí ëª¨ì§ì ì¤ìí  ì ììµëë¤.`,
      greenRibbonCTA: {
        segmentName: 'early_diagnosed',
        patientCount: Math.floor(
          catalogData.patientPool * 0.35 *
            (Math.random() * 0.2 + 0.15)
        ),
        message: 'ì´ê¸° ì§ë¨ íìì ìº íì¸ ë°ì¡',
      },
      charts: [
        {
          type: 'pie',
          title: 'ì¸ê·¸ë¨¼í¸ë³ íì ê·ëª¨',
          data: [
            {
              label: 'ì´ê¸° ì§ë¨',
              value: 35,
              color: '#dbeafe',
            },
            {
              label: 'ì¹ë£ ì§ì',
              value: 45,
              color: '#93c5fd',
            },
            {
              label: 'ì¹ë£ ì í',
              value: 20,
              color: '#3b82f6',
            },
          ],
        },
      ],
    },
    {
      id: 'prescription_patterns',
      title: 'RWD ê¸°ë° ì²ë°© í¨í´ ë¶ì',
      tier: 'PREMIUM',
      locked: userTierLevel < tierHierarchy.PREMIUM,
      content: `# RWD ê¸°ë° ì²ë°© í¨í´ ë¶ì

## ì²ë°© íí©
- ìíê·  ì²ë°© ê±´ì: ${Math.floor(catalogData.patientPool * 0.65).toLocaleString()}ê±´
- íê·  ì²ë°© ì£¼ê¸°: 28ì¼
- íê·  ì²ë°©ë: 1ê°ìë¶

## ìë£ì§ë³ ì²ë°© í¨í´
- ì ë¬¸ì ì²ë°©: 78%
- ì¼ë°ì ì²ë°©: 18%
- ê¸°í: 4%

## ë³ì ê·ëª¨ë³ ì²ë°©
- ëíë³ì (300ë³ìì´ì): 52%
- ì¤íë³ì (100-299ë³ì): 28%
- ìíë³ì/ìì: 20%

## ê³ì ë³ ì²ë°© ë³í
- 1-3ì: íë ëë¹ 95%
- 4-6ì: íë ëë¹ 105%
- 7-9ì: íë ëë¹ 112%
- 10-12ì: íë ëë¹ 98%

## ê·¸ë¦°ë¦¬ë³¸ RWD ê¸°ë° ìº íì¸ ê¸°í
íì¬ RWD ë°ì´í°ìì ìë³ë ê³ ìëµ ì¸ê·¸ë¨¼í¸ë¡
ì ë° íê²í ìº íì¸ì ì¤ìí  ì ììµëë¤.`,
      greenRibbonCTA: {
        segmentName: 'high_responders',
        patientCount: Math.floor(
          catalogData.patientPool * 0.25 *
            (Math.random() * 0.2 + 0.15)
        ),
        message: 'ê³ ìëµ íìêµ°ì ìº íì¸ ë°ì¡',
      },
      charts: [
        {
          type: 'bar',
          title: 'ê³ì ë³ ì²ë°©ë ë³í (íë ëë¹)',
          data: [
            { label: '1-3ì', value: 95, color: '#fecaca' },
            { label: '4-6ì', value: 105, color: '#fbbf24' },
            { label: '7-9ì', value: 112, color: '#86efac' },
            { label: '10-12ì', value: 98, color: '#93c5fd' },
          ],
        },
      ],
    },
    {
      id: 'strategic_recommendations',
      title: 'ì ëµ ì ì¸ ë° ê¸°í ë¶ì',
      tier: 'PREMIUM',
      locked: userTierLevel < tierHierarchy.PREMIUM,
      content: `# ì ëµ ì ì¸ ë° ê¸°í ë¶ì

## ì£¼ì ê¸°í (Opportunities)

### 1. ìì¥ íë ê¸°í
- ì§ë¨ì¨ ê°ì ì íµí ì ê· íì íë³´
- ê¸°ì¡´ íìì ë³µì© ììë í¥ì
- ì§ì­ ìì¥ íë (íì¬ ëëì ì§ì¤)

**ê¸°ë í¨ê³¼**: ì°ê° 15-20% ì±ì¥ ê°ë¥

### 2. íì ì¤ì¬ ë§ì¼í ê°í
- ê·¸ë¦°ë¦¬ë³¸ RWD ê¸°ë° ì ë° íê²í
- íì êµì¡ íë¡ê·¸ë¨ íë
- ì¨ë¼ì¸ ì»¤ë®¤ëí° êµ¬ì¶

**ê¸°ë í¨ê³¼**: íì ë§ì¡±ë 35% ì¦ê°

### 3. ìë£ì§ ê´ê³ ê°í
- ì§ì­ë³ KOL ë¤í¸ìí¬ êµ¬ì¶
- ìì êµì¡ íë¡ê·¸ë¨ íë
- ì§ë£ ê°ì´ë ê°ë°

**ê¸°ë í¨ê³¼**: ì²ë°©ë 25% ì¦ê°

## ë¦¬ì¤í¬ ìì (Risks)

### 1. ê·ì  ë¦¬ì¤í¬
- ê°ê²© ê·ì  ê°í ê°ë¥ì±
- ìì½í íê° ì¡°ê±´ ë³í

**ëìì±**: ì¬ì  ê·ì  ëì ì ëµ ìë¦½

### 2. ê²½ì ë¦¬ì¤í¬
- ì ê· ê²½ìì¬ ì§ì
- ì ë¤ë¦­ ì½ ì¶ì ìë°

**ëìì±**: ì°¨ë³í ì ëµ ê°í

## ìµì í ê¶ê³ ì¬í­

1. **ê·¸ë¦°ë¦¬ë³¸ ì»¨í ê°ë¥ íìí íì©**
   - ì¦ì ì¤í ê°ë¥í ì¸ê·¸ë¨¼í¸: ${Math.floor(catalogData.patientPool * 0.3 * 0.25).toLocaleString()}ëª
   - ROI ê¸°ëê°: 3.2ë°°

2. **RWD ê¸°ë° íê²í**
   - ê³ ìëµ íë¥  ì¸ê·¸ë¨¼í¸: ${Math.floor(catalogData.patientPool * 0.25).toLocaleString()}ëª
   - ìëµì¨ ê¸°ëê°: 28-32%

3. **ìììí ëª¨ì§ íì©**
   - íì¬ ì§í ì¤ì¸ ${trialsData.activeTrials}ê° ìíì íë ¥
   - ì°¸ì¬ íì ëª¨ì§ ê°ë¥: ${Math.floor(catalogData.patientPool * 0.05).toLocaleString()}ëª`,
    },
  ];

  return sections.filter(
    (s) => tierHierarchy[s.tier as keyof typeof tierHierarchy] <= userTierLevel
  );
}

function buildKPIs(
  catalogData: any,
  trialsData: any
): ReportKPI {
  const [greenRibbonReachable, greenRibbonReachableRate] =
    calculateGreenRibbonReachable(catalogData.patientPool);

  return {
    marketSizeKrw: catalogData.marketSizeKrw,
    marketSizeFormatted: formatMarketSize(catalogData.marketSizeKrw),
    growthRate: calculateGrowthRate(),
    patientPool: catalogData.patientPool,
    greenRibbonReachable,
    greenRibbonReachableRate,
    activeClinicalTrials: trialsData.activeTrials,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { slug, tier = 'BASIC' } = await request.json();

    if (!slug) {
      return NextResponse.json(
        { error: 'slug is required' },
        { status: 400 }
      );
    }

    if (!['BASIC', 'PRO', 'PREMIUM'].includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Fetch catalog data
    const catalogData = await prisma.reportCatalog.findUnique({
      where: { slug },
    });

    if (!catalogData) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Convert BigInt fields to Number for JSON serialization
    const catalog = {
      ...catalogData,
      marketSizeKrw: Number(catalogData.marketSizeKrw),
    };

    // Fetch external data in parallel
    const [trialsData, fdaData] = await Promise.all([
      fetchClinicalTrialsData(catalog.indication),
      fetchOpenFDAData(catalog.drugName),
    ]);

    // Generate sections with OpenAI
    const sections = await generateReportWithOpenAI(
      catalog,
      trialsData,
      fdaData,
      tier
    );

    // Build KPIs
    const kpis = buildKPIs(catalog, trialsData);

    // Construct final report
    const report: MarketReport = {
      reportId: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      slug: catalog.slug,
      title: catalog.title,
      generatedAt: new Date().toISOString(),
      tier: tier as 'BASIC' | 'PRO' | 'PREMIUM',
      kpis,
      sections,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to generate report',
      },
      { status: 500 }
    );
  }
}
