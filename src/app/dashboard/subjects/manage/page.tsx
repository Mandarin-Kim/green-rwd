'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  Save,
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  MapPin,
  ClipboardCheck,
  Activity,
} from 'lucide-react'
import { apiPost, apiPut, apiDelete, apiGet } from '@/lib/api'