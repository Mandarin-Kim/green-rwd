'use client';

import { useState } from 'react';
import { Sparkles, MessageSquare, Mail, Bell, Send, ChevronRight } from 'lucide-react';

export default function AIContentGenerationPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [targetSegment, setTargetSegment] = useState('');
  const [tone, setTone] = useState('formal');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const templates = [
    {
      id: 'sms',
      name: 'SMS',
      description: '단문 메시지 템플릿',
      icon: MessageSquare,
    },
    {
      id: 'email',
      name: 'Email',
      description: '이메일 템플릿',
      icon: Mail,
    },
    {
      id: 'push',
      name: 'Push 알림',
      description: '모바일 푸시 알림 템플릿',
      icon: Bell,
    },
    {
      id: 'kakao',
      name: 'KakaoTalk',
      description: '카카오톡 메시지 템플릿',
      icon: Send,
    },
  ];

  const segments = [
    '심부전 HFrEF',
    'NSCLC Stage III-IV',
    '건강검진 대상자',
    'SGLT2i 당뇨 환자',
    'GLP-1 비만치료제 관심층',
  ];

  const handleGenerateContent = () => {
    if (!campaignName || !targetSegment || !selectedTemplate) {
      alert('캠페인명, 타겟 세그머트, 템플릿을 모두 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      const mockContent = {
        sms: `[${campaignName}] 당신의 건강을 위한 새로운 치료법을 소개합니다. 지금 바로 상담받으세요. 링크: goo.gl/xxxxx`,
        email: `안녕하세요,\n\n${campaignName} 캠페인에 초대합니다.\n\n${targetSegment} 환자분들을 위한 특별한 기회입니다.\n자세한 내용은 첨부 파일을 참고해주세요.\n\n감사합니다.`,
        push: `[${campaignName}] ${targetSegment}을(를) 위한 퉹별 기회! 지금 확인하세요 →`,
        kakao: `${campaignName}\n\n${targetSegment} 환자분들께 특별한 소식을 전해드립니다.\n\n[자세히 보기] 버튼을 눌러 더 알아보세요!`,
      };

      setGeneratedContent(mockContent[selectedTemplate as keyof typeof mockContent] || '');
      setIsGenerating(false);
    }, 1500);
  };

  const characterCount = generatedContent.length;
  const estimatedCost = Math.ceil(characterCount / 50) * 30;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">AI 콘텐츠 생성</h1>
        <p className="text-slate-500">AI를 활용해 맞춤형 마케팅 콘텐츠를 자동 생성하세요</p>
      </div>

      {!selectedTemplate ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {templates.map((template) => {
            const IconComponent = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template.id)}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-primary transition-all text-left"
              >
                <div className="flex items-center justify-between mb-4">
                  <IconComponent className="w-8 h-8 text-primary" />
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="font-semibold text-navy mb-1">{template.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{template.description}</p>
                <button className="w-full px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition">
                  선택
                </button>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <button
            onClick={() => setSelectedTemplate(null)}
            className="text-primary hover:underline text-sm mb-6"
          >
            ← 다른 템플릿 선택
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  캠페인명
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="예: 심부전 Entresto 신약 소개"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  타경 세그먼트
                </label>
                <select
                  value={targetSegment}
                  onChange={(e) => setTargetSegment(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="">선택하세요</option>
                  {segments.map((seg) => (
                    <option key={seg} value={seg}>
                      {seg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-navy mb-2">
                  톤 & 스타일
                </label>
                <div className="flex gap-3">
                  {['formal', 'friendly', 'medical'].map((toneOption) => (
                    <button
                      key={toneOption}
                      onClick={() => setTone(toneOption)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        tone === toneOption
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {toneOption === 'formal'
                        ? '정중한'
                        : toneOption === 'friendly'
                          ? '친근한'
                          : '의학적'}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleGenerateContent}
                disabled={isGenerating || !campaignName || !targetSegment}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {isGenerating ? '생성 중...' : 'AI 생성'}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-navy mb-3">생성된 콘텐츠</h3>
                <div className="bg-slate-50 rounded-lg p-4 min-h-40 border border-slate-200">
                  <p className="text-slate-700 whitespace-pre-wrap text-sm">
                    {generatedContent || '콘텐츠가 여기에 표시됩니다'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">문자수</p>
                  <p className="text-lg font-bold text-navy">{characterCount}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-600 mb-1">예상 비용</p>
                  <p className="text-lg font-bold text-primary">₩{estimatedCost.toLocaleString()}</p>
                </div>
              </div>

              <button className="w-full px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition">
                클립보드 복사
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
