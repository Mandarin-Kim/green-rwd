'use client';

import React, { useState } from 'react';
import { BarChart3, Search } from 'lucide-react';

interface CampaignAnalytics {
  id: string;
  name: string;
  sent: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  startDate: string;
  endDate: string;
}

export default function CampaignsAnalyticsPage() {
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([
    {
      id: '1',
      name: '고혈압 약물 임상시험 모집',
      sent: 15420,
      openRate: 42.5,
      clickRate: 28.3,
      conversionRate: 12.7,
      startDate: '2026-03-01',
      endDate: '2026-03-28',
    },
    {
      id: '2',
      name: '당뇨병 신약 모집 캠페인',
      sent: 8950,
      openRate: 38.2,
      clickRate: 22.1,
      conversionRate: 9.3,
      startDate: '2026-02-15',
      endDate: '2026-03-15',
    },
    {
      id: '3',
      name: '장기 심혈관 임상시험',
      sent: 22340,
      openRate: 45.8,
      clickRate: 31.2,
      conversionRate: 1