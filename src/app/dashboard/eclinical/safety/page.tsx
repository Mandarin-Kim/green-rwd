'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  AlertCircle,
  FileText,
  Search,
  X,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { apiGet, apiPost } from 'A/lib/api'