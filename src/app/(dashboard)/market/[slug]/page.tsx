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
  region: string;
  marketSizeKrw: number;
  patientPool: number;
  priceBasic: number;
  pricePro: number;
  pricePremium: number;
  sampleUrl?: string;
  thumbnailUrl?: string;
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
    .replace(/(<li>.*<\/li>)/s, '<ul style="list-style-type: disc; margin: 0.5rem 0;">$1</ul>')
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
    }
  }, [slug]);

  // Generate report
  async function handleGenerateReport(tier: 'BASIC' | 'PRO' | 'PREMIUM' = 'BASIC') {
    try {
      setGenerating(true);
      setError(null);
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, tier }),
      });

      if (!response.ok) throw new Error('Failed to generate report');
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setGenerating(false);
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
                  value={catalogData.marketSizeKrw >= 100000000
                    ? `${(catalogData.marketSizeKrw / 100000000).toFixed(0)}억원`
                    : `${catalogData.marketSizeKrw.toLocaleString()}원`}
                />
                <KPICard
                  icon={Users}
                  label="환자풀"
                  value={catalogData.patientPool.toLocaleString()}
                  unit="명"
                />
                <KPICard
                  icon={Target}
                  label="그린리본 컨택 가능"
                  value={Math.floor(catalogData.patientPool * 0.25).toLocaleString()}
                  unit="명"
                  highlight
                />
                <KPICard
                  icon={Zap}
                  label="임상시험"
                  value="로드 중..."
                  unit="개"
                />
              </div>

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
                  보고서 생성
                </h3>
                <p style={{ color: '#1f2937', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                  아래 버튼을 클릭하여 AI 기반의 상세 시장 분석 보고서를 생성하세요.
                  생성된 보고서는 최대 10개 섹션으로 구성됩니다.
                </p>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {(['BASIC', 'PRO', 'PREMIUM'] as const).map((tier) => (
                    <button
                      key={tier}
                      onClick={() => handleGenerateReport(tier)}
                      disabled={generating}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        fontWeight: 600,
                        cursor: generating ? 'not-allowed' : 'pointer',
                        opacity: generating ? 0.6 : 1,
                      }}
                    >
                      {generating && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                      {tier} 보고서 생성
                    </button>
                  ))}
                </div>
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
