'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Lock,
  Loader2,
  BarChart3,
  Zap,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

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

interface ReportKPI {
  marketSizeKrw: number;
  marketSizeFormatted: string;
  growthRate: string;
  patientPool: number;
  greenRibbonReachable: number;
  greenRibbonReachableRate: string;
  activeClinicalTrials: number;
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

interface CatalogData {
  id: string;
  slug: string;
  title: string;
  description: string;
  categories: string[];
  therapeuticArea: string;
  drugName: string;
  indication: string;
  region?: string;
  marketSize?: string;
  marketSizeRaw?: number | null;
  marketSizeKrw?: number | null;
  patientPool?: string;
  patientPoolRaw?: number | null;
  clinicalTrialsCount?: number | null;
  priceBasic: number;
  pricePro: number;
  pricePremium: number;
  sampleUrl?: string;
  thumbnailUrl?: string;
  isGenerated?: boolean;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  let html = markdown
    .replace(/^### (.*?)$/gm, '<h3 style="font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem;">$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2 style="font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem;">$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1 style="font-size: 1.875rem; font-weight: 700; margin-bottom: 1rem;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
    .replace(/^- (.*?)$/gm, '<li style="margin-left: 1.5rem;">$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/, '<ul style="list-style-type: disc; margin: 0.5rem 0;">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin: 0.75rem 0;">')
    .replace(/^(?!<[^>]*>)(.*?)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p style="margin: 0.75rem 0;">${match}</p>`;
    });

  return `<div style="line-height: 1.6; color: #1f2937;">${html}</div>`;
}

// Simple Bar Chart Component
function BarChart({ data }: { data: ChartData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value));
  return (
    <div style={{ padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
      {data.map((item, idx) => (
        <div key={idx} style={{ marginBottom: '1rem' }}>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 500,
              marginBottom: '0.25rem',
              color: '#374151',
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              width: '100%',
              height: '24px',
              backgroundColor: '#e5e7eb',
              borderRadius: '0.25rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || '#0d9488',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            {item.value}%
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple Pie Chart Component
function PieChart({ data }: { data: ChartData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const gradientStops = data
    .map((item) => {
      const percent = (item.value / total) * 100;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return `${item.color || '#0d9488'} ${start}% ${cumulativePercent}%`;
    })
    .join(', ');

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '1rem' }}>
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `conic-gradient(${gradientStops})`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      />
      <div style={{ flex: 1 }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '2px',
                backgroundColor: item.color || '#0d9488',
                marginRight: '0.5rem',
              }}
            />
            <span style={{ color: '#374151' }}>
              {item.label}: {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Simple Donut Chart Component
function DonutChart({ data }: { data: ChartData[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  const gradientStops = data
    .map((item) => {
      const percent = (item.value / total) * 100;
      const start = cumulativePercent;
      cumulativePercent += percent;
      return `${item.color || '#0d9488'} ${start}% ${cumulativePercent}%`;
    })
    .join(', ');

  return (
    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', padding: '1rem' }}>
      <div
        style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: `conic-gradient(${gradientStops})`,
          position: 'relative',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: 'white',
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        {data.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: item.color || '#0d9488',
                marginRight: '0.5rem',
              }}
            />
            <span style={{ color: '#374151' }}>
              {item.label}: {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart Renderer
function ChartRenderer({ chart }: { chart: Chart }) {
  switch (chart.type) {
    case 'bar':
      return <BarChart data={chart.data} />;
    case 'pie':
      return <PieChart data={chart.data} />;
    case 'donut':
      return <DonutChart data={chart.data} />;
    case 'line':
      return <BarChart data={chart.data} />;
    default:
      return null;
  }
}

// KPI Card Component
function KPICard({
  icon: Icon,
  label,
  value,
  unit,
  highlight = false,
}: {
  icon: any;
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: highlight ? '#d1fae5' : 'white',
        border: `2px solid ${highlight ? '#10b981' : '#e5e7eb'}`,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        flex: 1,
        minWidth: '200px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
        <Icon
          size={20}
          style={{
            marginRight: '0.5rem',
            color: highlight ? '#10b981' : '#0d9488',
          }}
        />
        <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 500 }}>
          {label}
        </div>
      </div>
      <div
        style={{
          fontSize: '1.875rem',
          fontWeight: 700,
          color: highlight ? '#10b981' : '#1f2937',
        }}
      >
        {value}
      </div>
      {unit && (
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
          {unit}
        </div>
      )}
    </div>
  );
}

// Tier Badge
function TierBadge({ tier }: { tier: 'BASIC' | 'PRO' | 'PREMIUM' }) {
  const bgColors = {
    BASIC: '#dbeafe',
    PRO: '#fef3c7',
    PREMIUM: '#fce7f3',
  };
  const textColors = {
    BASIC: '#0c4a6e',
    PRO: '#92400e',
    PREMIUM: '#831843',
  };

  return (
    <span
      style={{
        display: 'inline-block',
        backgroundColor: bgColors[tier],
        color: textColors[tier],
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        marginLeft: '0.5rem',
      }}
    >
      {tier}
    </span>
  );
}

// Report Section Component
function ReportSectionCard({
  section,
  isAdmin,
}: {
  section: ReportSection;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const blurredStyle: React.CSSProperties = section.locked
    ? {
        filter: 'blur(4px)',
        pointerEvents: 'none',
        opacity: 0.5,
      }
    : {};

  return (
    <div
      style={{
        backgroundColor: 'white',
        borderLeft: `4px solid ${section.locked ? '#d1d5db' : '#0d9488'}`,
        borderRadius: '0.5rem',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
            {section.title}
          </h3>
          <TierBadge tier={section.tier} />
          {section.locked && (
            <Lock
              size={16}
              style={{
                marginLeft: '0.75rem',
                color: '#9ca3af',
              }}
            />
          )}
        </div>
        <div
          style={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            color: '#6b7280',
          }}
        >
          ▼
        </div>
      </div>

      {section.locked && (
        <div
          style={{
            backgroundColor: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <Lock size={16} style={{ color: '#6b7280' }} />
          <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>
            이 섹션은 {section.tier} 플랜에서 볼 수 있습니다. 업그레이드하세요.
          </span>
        </div>
      )}

      {expanded && (
        <div style={blurredStyle}>
          <div
            dangerouslySetInnerHTML={{
              __html: markdownToHtml(section.content),
            }}
            style={{
              marginBottom: section.charts || section.greenRibbonCTA ? '1.5rem' : 0,
            }}
          />

          {section.charts && section.charts.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              {section.charts.map((chart, idx) => (
                <div key={idx} style={{ marginBottom: '1.5rem' }}>
                  <h4
                    style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      marginBottom: '1rem',
                      color: '#1f2937',
                    }}
                  >
                    {chart.title}
                  </h4>
                  <ChartRenderer chart={chart} />
                </div>
              ))}
            </div>
          )}

          {section.greenRibbonCTA && !section.locked && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                borderLeft: '4px solid #10b981',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginTop: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                  color: '#047857',
                  fontWeight: 600,
                }}
              >
                <Target size={18} style={{ marginRight: '0.5rem' }} />
                그린리본 컨택 가능 세그먼트
              </div>
              <p style={{ margin: '0 0 0.75rem 0', color: '#1f2937', fontSize: '0.875rem' }}>
                {section.greenRibbonCTA.segmentName}: 약{' '}
                <strong>{section.greenRibbonCTA.patientCount.toLocaleString()}명</strong>
              </p>
              <p style={{ margin: '0 0 1rem 0', color: '#4b5563', fontSize: '0.875rem' }}>
                {section.greenRibbonCTA.message}
              </p>
              <a
                href={`/campaigns/new?segment=${section.greenRibbonCTA.segmentName}`}
                style={{
                  display: 'inline-block',
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                이 세그먼트에 캠페인 발송하기 →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Pricing Card Component
function PricingCard({
  tier,
  price,
  features,
  isCurrentTier,
}: {
  tier: 'BASIC' | 'PRO' | 'PREMIUM';
  price: number;
  features: string[];
  isCurrentTier: boolean;
}) {
  const bgColor = isCurrentTier ? '#eff6ff' : 'white';
  const borderColor = isCurrentTier ? '#0284c7' : '#e5e7eb';

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '0.75rem',
        padding: '1.5rem',
        flex: 1,
        minWidth: '250px',
        position: 'relative',
      }}
    >
      {isCurrentTier && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: '#0284c7',
            color: 'white',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            borderRadius: '0 0.75rem 0 0',
          }}
        >
          현재 플랜
        </div>
      )}
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
        {tier}
      </h3>
      <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: '#0d9488' }}>
        ₩{(price / 10000).toFixed(0)}만
      </div>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        한 달 구독
      </p>
      <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
        {features.map((feature, idx) => (
          <li
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '0.75rem',
              fontSize: '0.875rem',
              color: '#374151',
            }}
          >
            <span style={{ marginRight: '0.5rem', color: '#10b981' }}>✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <button
        style={{
          width: '100%',
          backgroundColor: isCurrentTier ? '#0d9488' : '#f3f4f6',
          color: isCurrentTier ? 'white' : '#1f2937',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'opacity 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '0.9';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
      >
        {isCurrentTier ? '구독 중' : '구독하기'}
      </button>
    </div>
  );
}

// Main Page Component
export default function ReportDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const isAdmin = true;

  const [catalogData, setCatalogData] = useState<CatalogData | null>(null);
  const [report, setReport] = useState<MarketReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'order'>('preview');
  const [error, setError] = useState<string | null>(null);

  // 5단계 준비 상태
  interface StepStatus {
    completed: boolean;
    loading: boolean;
    summary: string | null;
    error: string | null;
  }
  const [steps, setSteps] = useState<Record<number, StepStatus>>({
    1: { completed: false, loading: false, summary: null, error: null },
    2: { completed: false, loading: false, summary: null, error: null },
    3: { completed: false, loading: false, summary: null, error: null },
    4: { completed: false, loading: false, summary: null, error: null },
    5: { completed: false, loading: false, summary: null, error: null },
  });
  const [selectedTier, setSelectedTier] = useState<'BASIC' | 'PRO' | 'PREMIUM'>('BASIC');

  // Fetch catalog data on mount
  useEffect(() => {
    async function fetchCatalog() {
      try {
        setLoading(true);
        const response = await fetch(`/api/reports/${slug}`);
        if (!response.ok) throw new Error('Catalog not found');
        const result = await response.json();
        const catalogInfo = result.data || result;
        // categories가 없으면 빈 배열로 보정
        if (!catalogInfo.categories) {
          catalogInfo.categories = [];
        }
        setCatalogData(catalogInfo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchCatalog();
      // 캐시 상태도 로드
      fetchStepStatus();
    }
  }, [slug]);

  // 캐시 상태 조회
  async function fetchStepStatus() {
    try {
      const res = await fetch(`/api/reports/prepare?slug=${slug}`);
      if (!res.ok) return;
      const result = await res.json();
      if (result.success && result.data?.steps) {
        const s = result.data.steps;
        setSteps(prev => ({
          1: { ...prev[1], completed: s[1]?.completed || false, summary: s[1]?.summary || null },
          2: { ...prev[2], completed: s[2]?.completed || false, summary: s[2]?.summary || null },
          3: { ...prev[3], completed: s[3]?.completed || false, summary: s[3]?.summary || null },
          4: { ...prev[4], completed: s[4]?.completed || false, summary: s[4]?.summary || null },
          5: { ...prev[5], completed: s[5]?.completed || false, summary: s[5]?.summary || null },
        }));
      }
    } catch {}
  }

  // 개별 단계 실행
  async function handleRunStep(stepNum: number) {
    setError(null);
    setSteps(prev => ({
      ...prev,
      [stepNum]: { ...prev[stepNum], loading: true, error: null },
    }));

    // Step 5는 섹션별 분할 생성 (타임아웃 방지)
    if (stepNum === 5) {
      await handleRunStep5Sections();
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000); // 55초 안전 마진

      const response = await fetch('/api/reports/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          step: stepNum,
          tier: selectedTier,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('서버 응답을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.');
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || `Step ${stepNum} 실패`);
      }

      setSteps(prev => ({
        ...prev,
        [stepNum]: {
          completed: true,
          loading: false,
          summary: data.data?.summary || '완료',
          error: null,
        },
      }));
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? '시간 초과 (55초). 다시 시도해주세요.' : err.message)
        : '알 수 없는 오류';
      setSteps(prev => ({
        ...prev,
        [stepNum]: { ...prev[stepNum], loading: false, error: msg },
      }));
      setError(`Step ${stepNum} 오류: ${msg}`);
    }
  }

  // Step 5: AI 보고서 섹션별 분할 생성 (Vercel 60초 제한 대응 + 자동 재시도)
  async function handleRunStep5Sections() {
    let currentSectionIdx = 0;
    let activeOrderId: string | null = null;
    let totalSections = 0;
    const MAX_RETRIES_PER_SECTION = 3;

    while (true) {
      let retryCount = 0;
      let sectionSuccess = false;

      while (retryCount < MAX_RETRIES_PER_SECTION && !sectionSuccess) {
        try {
          const retryLabel = retryCount > 0 ? ` (재시도 ${retryCount}/${MAX_RETRIES_PER_SECTION})` : '';
          const progressText = totalSections > 0
            ? `섹션 ${currentSectionIdx + 1}/${totalSections} 생성 중${retryLabel}...`
            : `섹션 ${currentSectionIdx + 1} 생성 중${retryLabel}...`;
          setSteps(prev => ({
            ...prev,
            5: { ...prev[5], loading: true, error: null, summary: progressText },
          }));

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 55000);

          const response = await fetch('/api/reports/prepare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              slug,
              step: 5,
              tier: selectedTier,
              sectionIndex: currentSectionIdx,
              orderId: activeOrderId,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          let data;
          try {
            data = await response.json();
          } catch {
            throw new Error('서버 응답을 처리할 수 없습니다.');
          }

          if (!response.ok || !data.success) {
            const errMsg = data.error || `섹션 ${currentSectionIdx + 1} 생성 실패`;
            // TIMEOUT 에러면 재시도
            if (errMsg.includes('TIMEOUT') || errMsg.includes('시간 초과')) {
              throw new Error('TIMEOUT');
            }
            throw new Error(errMsg);
          }

          // orderId 추적
          if (data.data?.orderId) {
            activeOrderId = data.data.orderId;
          }
          if (data.data?.totalSections) {
            totalSections = data.data.totalSections;
          }

          // 완료 확인
          if (data.data?.isLast || data.data?.status === 'COMPLETED') {
            setSteps(prev => ({
              ...prev,
              5: { completed: true, loading: false, summary: '보고서 생성 완료!', error: null },
            }));
            if (activeOrderId) {
              setTimeout(() => {
                window.location.href = `/market/${slug}/view?orderId=${activeOrderId}`;
              }, 1500);
            }
            return;
          }

          // 성공 → 다음 섹션으로
          sectionSuccess = true;
          currentSectionIdx = data.data?.nextSectionIndex ?? (currentSectionIdx + 1);

        } catch (err) {
          retryCount++;
          const isTimeout = err instanceof Error &&
            (err.name === 'AbortError' || err.message.includes('TIMEOUT'));

          if (isTimeout && retryCount < MAX_RETRIES_PER_SECTION) {
            // 타임아웃이면 자동 재시도 (2초 대기 후)
            setSteps(prev => ({
              ...prev,
              5: { ...prev[5], loading: true, error: null, summary: `섹션 ${currentSectionIdx + 1} 재시도 중 (${retryCount}/${MAX_RETRIES_PER_SECTION})...` },
            }));
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }

          // 최대 재시도 초과 또는 다른 에러
          const msg = err instanceof Error
            ? (isTimeout ? `섹션 ${currentSectionIdx + 1} 시간 초과 (${MAX_RETRIES_PER_SECTION}회 재시도 실패). 다시 시도해주세요.` : err.message)
            : '알 수 없는 오류';
          setSteps(prev => ({
            ...prev,
            5: { ...prev[5], loading: false, error: msg },
          }));
          setError(`Step 5 오류: ${msg}`);
          return;
        }
      }
    }
  }

  // 전체 자동 실행 (1→2→3→4→5 순서대로)
  async function handleRunAll() {
    setError(null);
    for (const stepNum of [1, 2, 3, 4, 5]) {
      if (steps[stepNum].completed && stepNum !== 5) continue; // 이미 완료된 데이터 수집은 건너뜀
      await handleRunStep(stepNum);
      if (steps[stepNum]?.error) break; // 에러 발생 시 중단
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <Loader2
          size={32}
          style={{
            margin: '0 auto',
            animation: 'spin 1s linear infinite',
            color: '#0d9488',
          }}
        />
        <p style={{ marginTop: '1rem', color: '#6b7280' }}>로딩 중...</p>
      </div>
    );
  }

  if (!catalogData) {
    return (
      <div style={{ padding: '2rem' }}>
        <div style={{ color: '#dc2626' }}>보고서를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '1.5rem 2rem' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#0d9488',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          <ArrowLeft size={18} />
          뒤로 가기
        </button>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>
          {catalogData.title}
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {catalogData.categories.map((cat, idx) => (
            <span
              key={idx}
              style={{
                backgroundColor: '#ecfdf5',
                color: '#047857',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        {error && (
          <div
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        {!report ? (
          // Initial state: Show KPI placeholders and generate button
          <>
            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '2rem',
                marginBottom: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                핵심 지표
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}
              >
                <KPICard
                  icon={TrendingUp}
                  label="시장규모"
                  value={catalogData.marketSize || (catalogData.marketSizeRaw
                    ? (catalogData.marketSizeRaw >= 100000000
                      ? `${(catalogData.marketSizeRaw / 100000000).toFixed(0)}억원`
                      : `${catalogData.marketSizeRaw.toLocaleString()}원`)
                    : '-')}
                />
                <KPICard
                  icon={Users}
                  label="환자풀"
                  value={catalogData.patientPool || (catalogData.patientPoolRaw
                    ? catalogData.patientPoolRaw.toLocaleString()
                    : '-')}
                  unit={catalogData.patientPool ? '' : '명'}
                />
                <KPICard
                  icon={Target}
                  label="그린리본 컨택 가능"
                  value={catalogData.patientPoolRaw
                    ? Math.floor(catalogData.patientPoolRaw * 0.25).toLocaleString()
                    : '-'}
                  unit="명"
                  highlight
                />
                <KPICard
                  icon={Zap}
                  label="임상시험"
                  value={catalogData.clinicalTrialsCount != null
                    ? catalogData.clinicalTrialsCount.toLocaleString()
                    : '-'}
                  unit="개"
                />
              </div>

              {/* 4단계 보고서 생성 UI */}
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    color: '#047857',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  보고서 생성 (5단계)
                </h3>
                <p style={{ color: '#1f2937', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                  각 단계 버튼을 순서대로 클릭하세요. 한번 수집한 데이터는 DB에 캐시되어 다음에 즉시 사용됩니다.
                </p>

                {/* 티어 선택 */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  {(['BASIC', 'PRO', 'PREMIUM'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTier(t)}
                      style={{
                        padding: '0.4rem 1rem',
                        borderRadius: '0.5rem',
                        border: selectedTier === t ? '2px solid #0d9488' : '1px solid #d1d5db',
                        backgroundColor: selectedTier === t ? '#ccfbf1' : 'white',
                        color: selectedTier === t ? '#0d9488' : '#6b7280',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                {/* 5단계 버튼 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {([
                    { num: 1, label: '① HIRA 건강보험심사평가원', icon: '🏥', desc: '환자수, 진료비, 연령/성별 분포' },
                    { num: 2, label: '② ClinicalTrials.gov', icon: '🔬', desc: '임상시험 현황 (Phase, 스폰서)' },
                    { num: 3, label: '③ PubMed 논문 검색', icon: '📄', desc: '최신 논문 인용 데이터' },
                    { num: 4, label: '④ 글로벌 의료데이터', icon: '🌍', desc: 'CMS Medicare(미국) · PBS(호주) · NHS(영국)' },
                    { num: 5, label: '⑤ AI 보고서 생성', icon: '🤖', desc: '캐시 데이터 기반 AI 보고서 작성' },
                  ]).map(({ num, label, icon, desc }) => {
                    const s = steps[num];
                    const anyLoading = Object.values(steps).some(st => st.loading);
                    const isDisabled = s.loading || (anyLoading && !s.loading);
                    return (
                      <div key={num} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          onClick={() => handleRunStep(num)}
                          disabled={isDisabled}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.875rem 1.25rem',
                            borderRadius: '0.75rem',
                            border: s.completed ? '2px solid #10b981' : s.error ? '2px solid #ef4444' : '1px solid #d1d5db',
                            backgroundColor: s.completed ? '#ecfdf5' : s.loading ? '#f0f9ff' : 'white',
                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                            opacity: isDisabled && !s.loading ? 0.5 : 1,
                            transition: 'all 0.2s',
                            textAlign: 'left',
                          }}
                        >
                          <span style={{ fontSize: '1.5rem' }}>
                            {s.loading ? '' : s.completed ? '✅' : s.error ? '❌' : icon}
                          </span>
                          {s.loading && (
                            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: '#0d9488' }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1f2937' }}>{label}</div>
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                              {s.loading ? '수집 중...' : s.completed ? s.summary : s.error ? s.error : desc}
                            </div>
                          </div>
                          {s.completed && !s.loading && (
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>완료</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* 전체 실행 버튼 */}
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={handleRunAll}
                    disabled={Object.values(steps).some(s => s.loading)}
                    style={{
                      flex: 1,
                      padding: '0.875rem',
                      borderRadius: '0.75rem',
                      border: 'none',
                      backgroundColor: '#0d9488',
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1rem',
                      cursor: Object.values(steps).some(s => s.loading) ? 'not-allowed' : 'pointer',
                      opacity: Object.values(steps).some(s => s.loading) ? 0.6 : 1,
                      boxShadow: '0 2px 8px rgba(13,148,136,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {Object.values(steps).some(s => s.loading) ? '진행 중...' : '전체 자동 실행 (1→2→3→4→5)'}
                  </button>
                </div>

                {/* 진행 바 */}
                {Object.values(steps).some(s => s.loading || s.completed) && (
                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${(Object.values(steps).filter(s => s.completed).length / 5) * 100}%`,
                          backgroundColor: '#10b981',
                          borderRadius: '4px',
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', textAlign: 'center' }}>
                      {Object.values(steps).filter(s => s.completed).length}/5 단계 완료
                    </div>
                  </div>
                )}

                {/* CSV Row Data 다운로드 (데이터 수집 완료 시 표시) */}
                {(steps[1].completed || steps[2].completed || steps[4].completed) && (
                  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#92400e' }}>제약사 실무용 Row Data</div>
                        <div style={{ fontSize: '0.75rem', color: '#a16207', marginTop: '0.25rem' }}>
                          처방전·치료여정·약가비교·임상시험 개별건 단위 데이터 (PREMIUM 전용)
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=rowdata`, '_blank')}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          borderRadius: '0.5rem',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.375rem',
                        }}
                      >
                        📥 Row Data 전체 다운로드
                      </button>
                    </div>
                    {/* 개별 Row Data 다운로드 버튼 */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      {steps[1].completed && (
                        <button
                          onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=prescription`, '_blank')}
                          style={{ padding: '0.375rem 0.75rem', backgroundColor: 'white', color: '#92400e', borderRadius: '0.375rem', border: '1px solid #fde68a', fontWeight: 500, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          💊 처방전 Row Data
                        </button>
                      )}
                      {steps[1].completed && (
                        <button
                          onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=patient-journey`, '_blank')}
                          style={{ padding: '0.375rem 0.75rem', backgroundColor: 'white', color: '#92400e', borderRadius: '0.375rem', border: '1px solid #fde68a', fontWeight: 500, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          🗺️ 환자 치료여정 Row Data
                        </button>
                      )}
                      {(steps[1].completed || steps[4].completed) && (
                        <button
                          onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=global-pricing`, '_blank')}
                          style={{ padding: '0.375rem 0.75rem', backgroundColor: 'white', color: '#92400e', borderRadius: '0.375rem', border: '1px solid #fde68a', fontWeight: 500, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          🌍 글로벌 약가 비교 Row Data
                        </button>
                      )}
                      {steps[2].completed && (
                        <button
                          onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=clinical-detail`, '_blank')}
                          style={{ padding: '0.375rem 0.75rem', backgroundColor: 'white', color: '#92400e', borderRadius: '0.375rem', border: '1px solid #fde68a', fontWeight: 500, fontSize: '0.75rem', cursor: 'pointer' }}
                        >
                          🔬 임상시험 상세 Row Data
                        </button>
                      )}
                    </div>
                    {/* 집계 통계 다운로드 */}
                    <div style={{ borderTop: '1px solid #fde68a', paddingTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.6875rem', color: '#a16207', lineHeight: '1.75rem' }}>집계 통계:</span>
                      <button
                        onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=all`, '_blank')}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: '#a16207', borderRadius: '0.25rem', border: '1px dashed #fde68a', fontSize: '0.6875rem', cursor: 'pointer' }}
                      >
                        전체 (Row+집계)
                      </button>
                      <button
                        onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=hira`, '_blank')}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: '#a16207', borderRadius: '0.25rem', border: '1px dashed #fde68a', fontSize: '0.6875rem', cursor: 'pointer' }}
                      >
                        HIRA 집계
                      </button>
                      <button
                        onClick={() => window.open(`/api/reports/export-csv?slug=${slug}&type=global`, '_blank')}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: 'transparent', color: '#a16207', borderRadius: '0.25rem', border: '1px dashed #fde68a', fontSize: '0.6875rem', cursor: 'pointer' }}
                      >
                        글로벌 집계
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
                보고서 설명
              </h2>
              <p style={{ color: '#4b5563', lineHeight: 1.6 }}>
                {catalogData.description}
              </p>
            </div>
          </>
        ) : (
          // Report generated state
          <>
            {/* Tab Navigation */}
            <div
              style={{
                display: 'flex',
                gap: '0',
                borderBottom: '2px solid #e5e7eb',
                marginBottom: '2rem',
              }}
            >
              {(['preview', 'order'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '1rem 1.5rem',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab ? '3px solid #0d9488' : 'none',
                    color: activeTab === tab ? '#0d9488' : '#6b7280',
                    fontWeight: activeTab === tab ? 600 : 500,
                    cursor: 'pointer',
                    fontSize: '1rem',
                  }}
                >
                  {tab === 'preview' ? '미리보기' : '주문하기'}
                </button>
              ))}
            </div>

            {activeTab === 'preview' && (
              <>
                {/* KPI Cards */}
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    marginBottom: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    핵심 지표 (KPIs)
                  </h2>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                    }}
                  >
                    <KPICard
                      icon={TrendingUp}
                      label="시장규모"
                      value={report.kpis.marketSizeFormatted}
                    />
                    <KPICard
                      icon={Zap}
                      label="성장률"
                      value={report.kpis.growthRate}
                      unit="연간"
                    />
                    <KPICard
                      icon={Users}
                      label="환자풀"
                      value={report.kpis.patientPool.toLocaleString()}
                      unit="명"
                    />
                    <KPICard
                      icon={Target}
                      label="그린리본 컨택 가능"
                      value={report.kpis.greenRibbonReachable.toLocaleString()}
                      unit="명"
                      highlight
                    />
                    <KPICard
                      icon={BarChart3}
                      label="진행중 임상시험"
                      value={report.kpis.activeClinicalTrials}
                      unit="개"
                    />
                  </div>
                </div>

                {/* Report Info */}
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    marginBottom: '2rem',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    생성된 보고서 ID: <strong>{report.reportId}</strong>
                  </div>
                  <div>
                    {new Date(report.generatedAt).toLocaleString('ko-KR')}
                  </div>
                </div>

                {/* Sections */}
                <div
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '0.75rem',
                    padding: '2rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                    보고서 섹션
                  </h2>
                  {report.sections.map((section) => (
                    <ReportSectionCard
                      key={section.id}
                      section={section}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </>
            )}

            {activeTab === 'order' && (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  padding: '2rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                  플랜 선택
                </h2>
                <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                  적절한 플랜을 선택하여 구독하세요. 언제든지 업그레이드할 수 있습니다.
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                  }}
                >
                  <PricingCard
                    tier="BASIC"
                    price={catalogData.priceBasic}
                    features={[
                      '시장 개요',
                      'PEST 분석',
                      '질환 역학 데이터',
                      '기본 차트',
                    ]}
                    isCurrentTier={report.tier === 'BASIC'}
                  />
                  <PricingCard
                    tier="PRO"
                    price={catalogData.pricePro}
                    features={[
                      'BASIC 모든 항목',
                      '경쟁 환경 분석',
                      '약물 안전성 분석',
                      '임상시험 데이터',
                      "Porter's 5 Forces",
                    ]}
                    isCurrentTier={report.tier === 'PRO'}
                  />
                  <PricingCard
                    tier="PREMIUM"
                    price={catalogData.pricePremium}
                    features={[
                      'PRO 모든 항목',
                      '환자 세그먼트 분석',
                      'RWD 처방 패턴',
                      '그린리본 캠페인 발송',
                      '전략 제언',
                    ]}
                    isCurrentTier={report.tier === 'PREMIUM'}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
