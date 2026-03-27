'use client'

import { useState, useMemo, Suspense } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface RWDRecord {
  id: string
  ageGroup: string
  gender: string
  icd10: string
  diagnosis: string
  medication: string
  region: string
  channel: string
  lastActivity: string
}

const mockRWDData: RWDRecord[] = [
  { id: 'LC-HF-00412', ageGroup: '60대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '발사르탄 160mg', region: '서울', channel: 'SMS가능', lastActivity: '2026-03-15' },
  { id: 'LC-HF-01287', ageGroup: '50대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '에날라프릴 10mg', region: '경기', channel: 'SMS가능', lastActivity: '2026-03-20' },
  { id: 'LC-HF-02156', ageGroup: '70대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '베타차단제', region: '부산', channel: 'SMS불가', lastActivity: '2026-03-18' },
  { id: 'LC-HF-02891', ageGroup: '40대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '발사르탄 80mg', region: '서울', channel: 'SMS가능', lastActivity: '2026-03-22' },
  { id: 'LC-HF-03421', ageGroup: '60대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '리시노프릴', region: '대구', channel: 'SMS가능', lastActivity: '2026-03-17' },
  { id: 'LC-HF-04012', ageGroup: '50대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '아미오다론', region: '경기', channel: 'SMS가능', lastActivity: '2026-03-19' },
  { id: 'LC-HF-04567', ageGroup: '70대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '카베디례', region: '인천', channel: 'SMS불가', lastActivity: '2026-03-16' },
  { id: 'LC-HF-05234', ageGroup: '60대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '발사르탄 160mg', region: '서울', channel: 'SMS가능', lastActivity: '2026-03-21' },
  { id: 'LC-HF-05789', ageGroup: '50대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '스피로녠락톤', region: '부산', channel: 'SMS가능', lastActivity: '2026-03-14' },
  { id: 'LC-HF-06312', ageGroup: '60대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '디직탈리스', region: '광주', channel: 'SMS가능', lastActivity: '2026-03-23' },
  { id: 'LC-HF-06845', ageGroup: '50대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '니트로글리세린', region: '대전', channel: 'SMS불가', lastActivity: '2026-03-13' },
  { id: 'LC-HF-07421', ageGroup: '70대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '베타차단제', region: '울산', channel: 'SMS가능', lastActivity: '2026-03-20' },
  { id: 'LC-HF-08012', ageGroup: '60대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '에날라프릴 10mg', region: '경기', channel: 'SMS가능', lastActivity: '2026-03-19' },
  { id: 'LC-HF-08567', ageGroup: '50대', gender: '여', icd10: 'I50.0', diagnosis: '심부전', medication: '발사르탄 120mg', region: '서울', channel: 'SMS가능', lastActivity: '2026-03-22' },
  { id: 'LC-HF-09234', ageGroup: '60대', gender: '남', icd10: 'I50.0', diagnosis: '심부전', medication: '카베디놀', region: '부산', channel: 'SMS불가', lastActivity: '2026-03-18' },
]

const costPerPerson = 4720 // ₩ per person

export default function RWDListPage() {
  const reportId = '1'

  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [ageFilter, setAgeFilter] = useState<string[]>([])
  const [genderFilter, setGenderFilter] = useState<string[]>([])
  const [regionFilter, setRegionFilter] = useState<string[]>([])
  const [channelFilter, setChannelFilter] = useState<string[]>([])

  const totalPatients = 4217

  // Filter logic
  const filteredData = useMemo(() => {
    return mockRWDData.filter(record => {
      if (ageFilter.length > 0 && !ageFilter.includes(record.ageGroup)) return false
      if (genderFilter.length > 0 && !genderFilter.includes(record.gender)) return false
      if (regionFilter.length > 0 && !regionFilter.includes(record.region)) return false
      if (channelFilter.length > 0 && !channelFilter.includes(record.channel)) return false
      return true
    })
  }, [ageFilter, genderFilter, regionFilter, channelFilter])

  const toggleRow = (id: string) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const toggleAllRows = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(filteredData.map(d => d.id)))
    }
  }

  const estimatedCost = selectedRows.size * costPerPerson

  const toggleFilter = (value: string, filter: string[], setFilter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (filter.includes(value)) {
      setFilter(filter.filter(f => f !== value))
    } else {
      setFilter([...filter, value])
    }
  }

  return (
    <div className="p-8 pb-32">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy mb-2">RWD 리스트</h1>
        <p className="text-slate-500">심부전 대상자 기반 타겟 리스트를 필터링하고 세그먼트를 등록하세요</p>
      </div>

      {/* Condition Bar */}
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">심부전 HFrEF</span> · <span className="font-semibold">40~80세</span> · <span className="font-semibold">서울/경기/부산</span>
        </p>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        {/* Filter Panel */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-8">
            <h3 className="font-semibold text-navy mb-4 text-[14px]">필터</h3>

            {/* Age Range */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">연령대</p>
              <div className="space-y-2">
                {['40대', '50대', '60대', '70대', '80대'].map(age => (
                  <label key={age} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ageFilter.includes(age)}
                      onChange={() => toggleFilter(age, ageFilter, setAgeFilter)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{age}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div className="mb-5 pb-5 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">성별</p>
              <div className="space-y-2">
                {['남', '여'].map(gender => (
                  <label key={gender} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genderFilter.includes(gender)}
                      onChange={() => toggleFilter(gender, genderFilter, setGenderFilter)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{gender}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Region */}
            <div className="mb-5 pb-5 border-b border-slate-200">
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">지역</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {['서울', '경기', '부산', '대구', '대전', '광주', '인천', '울산'].map(region => (
                  <label key={region} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regionFilter.includes(region)}
                      onChange={() => toggleFilter(region, regionFilter, setRegionFilter)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{region}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Channel */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase">채널</p>
              <div className="space-y-2">
                {['SMS가능', 'SMS불가'].map(channel => (
                  <label key={channel} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={channelFilter.includes(channel)}
                      onChange={() => toggleFilter(channel, channelFilter, setChannelFilter)}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-xs text-slate-600 font-semibold">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                        onChange={toggleAllRows}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">비식별 ID</th>
                    <th className="px-4 py-3 text-left">연령대</th>
                    <th className="px-4 py-3 text-left">성별</th>
                    <th className="px-4 py-3 text-left">질환</th>
                    <th className="px-4 py-3 text-left">약물이력</th>
                    <th className="px-4 py-3 text-left">지역</th>
                    <th className="px-4 py-3 text-left">채널</th>
                    <th className="px-4 py-3 text-right">마지막활동</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map(record => (
                    <tr
                      key={record.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        selectedRows.has(record.id) ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(record.id)}
                          onChange={() => toggleRow(record.id)}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-navy">{record.id}</td>
                      <td className="px-4 py-3 text-slate-700">{record.ageGroup}</td>
                      <td className="px-4 py-3 text-slate-700">{record.gender}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="text-[12px]">{record.icd10}</span><br />
                        <span className="text-[13px] text-navy font-medium">{record.diagnosis}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[12px]">{record.medication}</td>
                      <td className="px-4 py-3 text-slate-700">{record.region}</td>
                      <td className="px-4 py-3 text-slate-700 text-[12px]">{record.channel}</td>
                      <td className="px-4 py-3 text-right text-slate-500 text-[12px]">{record.lastActivity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-[230px] right-0 bg-white border-t border-slate-200 shadow-lg">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              총 {totalPatients.toLocaleString()}명 중 <span className="font-semibold text-navy">{selectedRows.size.toLocaleString()}명</span> 선택
            </span>
            {selectedRows.size > 0 && (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <span className="text-sm text-slate-600">예상 발송 비용:</span>
                <span className="text-lg font-bold text-primary">₩{estimatedCost.toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRows.size === filteredData.length && filteredData.length > 0}
                onChange={toggleAllRows}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">전체 선택</span>
            </label>
            <button
              disabled={selectedRows.size === 0}
              className="px-6 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-[13px]"
            >
              선택 대상 세그먼트 등록
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
