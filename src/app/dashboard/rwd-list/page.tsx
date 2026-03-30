'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  Database,
  Filter,
  Download,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  Activity,
  MapPin,
  FileText,
  BarChart3,
} from 'lucide-react'
import { apiGet } from '@/lib/api'