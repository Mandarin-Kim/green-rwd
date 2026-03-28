'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, ClipboardCheck, AlertTriangle, FileText, ChevronDown } from 'lucide-react';

interface Criterion {
  id: string;
  text: string;
  checked: boolean;
}

const inclusionCriteria: Criterion[] = [
  { id: 'incl-1', text: '만 18세 이상 75세 이하의 성인', checked: false },
  { id: 'incl-2', text: 'New York Heart Association (NYHA) Class II~IV 심부전 환자', checked: false },
  { id: 'incl-3', text: '좌심실 박출률(LVEF) 40% 이하', checked: false },
  { id: 'incl-4', text: '최근 3개월 이내 안정된 용량의 ACE억제제 또는 ARB 투여 중', checked: false },
  { id: 'incl-5', text: '임상시험 참여 동의서 서명', checked: false },
];

const exclusionCriteria: Criterion[] = [
  { id: 'excl-1', text: '임신 중이거나 수유 중인 여성', checked: false },
  { id: 'excl-2', text: '최근 3개월 내 심근경색 병력', checked: false },
  { id: 'excl-3', text: '심각한 간 또는 신장 질환 (eGFR < 30 mL/min/1.73m²)', checked: false },
  { id: 'excl-4', text: '탈 임상시험에 참여 중인 환자', checked: false },
];

export default function SubjectQualifyPage() {
  const [inclusions, setInclusions] = useState<Criterion[]>(inclusionCriteria);
  const [exclusions, setExclusions] = useState<Criterion[]>(exclusionCriteria);

  const handleInclusionChange = (id: string) => {
    setInclusions(inclusions.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const handleExclusionChange = (id: string) => {
    setExclusions(exclusions.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const inclusionMet = inclusions.filter(c => c.checked).length;
  const exclusionMet = exclusions.filter(c => c.checked).length;
  
  const isQualified = inclusionMet === inclusions.length && exclusionMet === 0;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy mb-2">적격성 평가</h1>
          <p className="text-slate-500">임상시험 참여 적격성 판정</p>
        </div>

        <div className="grid grid-cols-3 gap-8 mb-8">
          {/* Left Panel - Subject Info */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <FileText className="w-5 h-5 text-navy" />
                <h2 className="text-lg font-semibold text-navy">대상자 정보</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">대상자ID</p>
                  <p className="text-sm font-medium text-navy">S001</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">이름</p>
                  <p className="text-sm font-medium text-navy">K.M</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">나이/성별</p>
                  <p className="text-sm font-medium text-navy">52/남</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">진단명</p>
                  <p className="text-sm font-medium text-navy">심부전 (NYHA Class III)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">LVEF</p>
                  <p className="text-sm font-medium text-navy">35%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">현재 약물</p>
                  <div className="text-xs font-medium text-navy space-y-1">
                    <p>- Lisinopril 20mg</p>
                    <p>- Metoprolol 190mg</p>
                    <p>- Furosemide 40mg</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Criteria Checklist */}
          <div className="col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              {/* Inclusion Criteria */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  포함기준 ({inclusionMet}/{inclusions.length})
                </h3>
                <div className="space-y-3">
                  {inclusions.map((criterion) => (
                    <label key={criterion.id} className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-3 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={criterion.checked}
                        onChange={() => handleInclusionChange(criterion.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 pt-0.5">{criterion.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Exclusion Criteria */}
              <div className="border-t border-slate-200 pt-8">
                <h3 className="text-lg font-semibold text-navy mb-4 flex items-center gap-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  제외기준 ({exclusionMet}개 충족 시 부적격)
                </h3>
                <div className="space-y-3">
                  {exclusions.map((criterion) => (
                    <label key={criterion.id} className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 p-3 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={criterion.checked}
                        onChange={() => handleExclusionChange(criterion.id)}
                        className="mt-1 w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-600 cursor-pointer"
                      />
                      <span className="text-sm text-slate-700 pt-0.5">{criterion.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Qualification Result */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isQualified ? (
                <>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-600">적격 판정</p>
                    <p className="text-sm text-slate-500">포함기준 충족, 제외기준 미충족</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-8 h-8 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-600">판정 대기중</p>
                    <p className="text-sm text-slate-500">
                      {inclusionMet < inclusions.length && `포함기준 ${inclusions.length - inclusionMet}개 미충족`}
                      {exclusionMet > 0 && ` / 제외기준 ${exclusionMet}개 충족`}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-navy">{isQualified ? '적격' : '부적격'}</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button className="px-6 py-2 border border-slate-200 text-navy rounded-lg hover:bg-slate-50 transition-all">
            취소
          </button>
          <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all">
            <ClipboardCheck className="w-5 h-5" />
            판정 완료
          </button>
        </div>
      </div>
    </div>
  );
}
