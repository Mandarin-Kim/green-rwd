'use client';

import { useState } from 'react';
import { Folder, FolderPlus, Calendar, Users, Activity } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  sponsor: string;
  phase: string;
  status: 'ongoing' | 'pending' | 'completed';
  progress: number;
  startDate: string;
  endDate: string;
  teamMembers: number;
}

const mockProjects: Project[] = [
  {
    id: 'P001',
    name: 'Entresto 심부전',
    sponsor: 'Novartis',
    phase: 'Phase III',
    status: 'ongoing',
    progress: 65,
    startDate: '2024-01-15',
    endDate: '2025-06-30',
    teamMembers: 5,
  },
  {
    id: 'P002',
    name: '키트루다 NSCLC',
    sponsor: 'MSD',
    phase: 'Phase III',
    status: 'ongoing',
    progress: 48,
    startDate: '2024-02-01',
    endDate: '2025-12-31',
    teamMembers: 6,
  },
  {
    id: 'P003',
    name: 'SGLT2i 시판후조사',
    sponsor: 'AstraZeneca',
    phase: 'Phase IV',
    status: 'pending',
    progress: 12,
    startDate: '2024-04-01',
    endDate: '2025-09-30',
    teamMembers: 3,
  },
  {
    id: 'P004',
    name: '루테인 건기식 효능연구',
    sponsor: '그린리본',
    phase: '효능연구',
    status: 'ongoing',
    progress: 78,
    startDate: '2023-06-15',
    endDate: '2024-12-31',
    teamMembers: 2,
  },
  {
    id: 'P005',
    name: '건강검진 센터 프로모션',
    sponsor: '그린리본',
    phase: 'Marketing',
    status: 'completed',
    progress: 100,
    startDate: '2023-09-01',
    endDate: '2024-02-28',
    teamMembers: 4,
  },
];

const statusLabels: Record<string, string> = {
  ongoing: '진행중',
  pending: '대기',
  completed: '완료',
};

const statusColors: Record<string, string> = {
  ongoing: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-green-100 text-green-800',
};

const progressBarColors: Record<string, string> = {
  ongoing: 'bg-blue-600',
  pending: 'bg-amber-600',
  completed: 'bg-green-600',
};

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-navy mb-2">프로젝트</h1>
            <p className="text-slate-500">임상시험 및 마케팅 프로젝트 관리</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-all">
            <FolderPlus className="w-5 h-5" />
            새 프로젝트
          </button>
        </div>

        {/* Project Grid */}
        <div className="grid grid-cols-2 gap-6">
          {mockProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3 flex-1">
                  <Folder className="w-6 h-6 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-navy text-lg">{project.name}</h3>
                    <p className="text-sm text-slate-600">{project.sponsor}</p>
                  </div>
                </div>
              </div>

              {/* Status and Phase */}
              <div className="flex gap-2 mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[project.status]}`}>
                  {statusLabels[project.status]}
                </span>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                  {project.phase}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-medium text-slate-600">진행률</p>
                  <p className="text-sm font-semibold text-navy">{project.progress}%</p>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${progressBarColors[project.status]}`}
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 text-sm text-slate-600 mb-4 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{project.startDate}</span>
                </div>
                <span className="text-slate-400">~</span>
                <span>{project.endDate}</span>
              </div>

              {/* Team Members */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Users className="w-4 h-4" />
                  <span>{project.teamMembers}명</span>
                </div>
                <button className="text-primary hover:text-opacity-80 transition-colors text-sm font-medium">
                  상세보기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
