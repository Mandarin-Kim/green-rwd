'use client'
import { useState } from 'react'
import { Users, Plus, Search, Filter, Edit2, Trash2, X, Save, ChevronDown, Download, Eye } from 'lucide-react'

type Subject = {
  id: string; name: string; age: number; gender: string; site: string; status: string; enrollDate: string; phone: string; diagnosis: string
}

const initialSubjects: Subject[] = [
  { id: 'SCR-0045', name: '김민수', age: 58, gender: '남', site: '서울대병원', status: '등록완료', enrollDate: '2024-01-08', phone: '010-1234-5678', diagnosis: '비소세포폐암' },
  { id: 'SCR-0078', name: '이영희', age: 45, gender: '여', site: '세브란스병원', status: '스크리닝', enrollDate: '2024-01-12', phone: '010-2345-6789', diagnosis: '유방암' },
  { id: 'SCR-0091', name: '박철수', age: 62, gender: '남', site: '고려대병원', status: '등록완료', enrollDate: '2024-01-14', phone: '010-3456-7890', diagnosis: '대장암' },
  { id: 'SCR-0112', name: '최수진', age: 51, gender: '여', site: '삼성서울병원', st