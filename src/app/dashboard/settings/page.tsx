'use client'

import { useEffect, useState } from 'react'
import { Save, AlertCircle, Loader2 } from 'lucide-react'
import { apiGet, apiPut } from '@/lib/api'

interface Settings {
  theme: 'light' | 'dark'
  language: 'ko' | 'en'
  timezone: string
  notificationsEmail: boolean
  notificationsSms: boolean
  notificationsPush: boolean
  autoLogout: number
  twoFactorAuth: boolean
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    theme: 'light',
    language: 'ko',
    timezone: 'Asia/Seoul',
    notificationsEmail: true,
    notificationsSms: true,
    notificationsPush: false,
    autoLogout: 30,
    twoFactorAuth: false,
  })
  const [originalSettings, setOriginalSettings] = useState<Settings>(settings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiGet('/api/settings')
        if (data) {
          setSettings(data)
          setOriginalSettings(data)
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err)
        setError('ì¤ì ì ë¶ë¬ì¤ëë° ì¤í¨íìµëë¤.')
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }))
    setSuccess(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)
      await apiPut('/api/settings', settings)
      setOriginalSettings(settings)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('ì¤ì  ì ì¥ì ì¤í¨íìµëë¤.')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings)

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ì¤ì </h1>
        <p className="text-gray-600 mt-2">ìì¤í ì¤ì  ë° ê°ì¸ ì í¸ë ê´ë¦¬</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">ì¤ë¥</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
          <div className="text-green-800 font-medium">ì¤ì ì´ ì ì¥ëììµëë¤.</div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-8">
          {/* Display Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">íë©´ ì¤ì </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">íë§</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleChange('theme', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="light">ë°ì ëª¨ë</option>
                  <option value="dark">ì´ëì´ ëª¨ë</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ì¸ì´</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="ko">íêµ­ì´</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ìê°ë</label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleChange('timezone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Asia/Seoul">ìì¸ (UTC+9)</option>
                  <option value="Asia/Tokyo">ëì¿ (UTC+9)</option>
                  <option value="America/New_York">ë´ì (UTC-5)</option>
                  <option value="Europe/London">ë°ë (UTC+0)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ìë ë¡ê·¸ìì (ë¶)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.autoLogout}
                  onChange={(e) => handleChange('autoLogout', parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Notification Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ìë¦¼ ì¤ì </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEmail}
                  onChange={(e) => handleChange('notificationsEmail', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">ì´ë©ì¼ ìë¦¼</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsSms}
                  onChange={(e) => handleChange('notificationsSms', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">SMS ìë¦¼</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsPush}
                  onChange={(e) => handleChange('notificationsPush', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">í¸ì ìë¦¼</span>
              </label>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* Security Settings */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">ë³´ì ì¤ì </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.twoFactorAuth}
                  onChange={(e) => handleChange('twoFactorAuth', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">2ë¨ê³ ì¸ì¦ íì±í</span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => {
              setSettings(originalSettings)
              setError(null)
              setSuccess(false)
            }}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ì´ê¸°í
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                ì ì¥ì¤...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                ì ì¥
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'

import { useEffect, useState } from 'react'
import {
  Settings,
  Save,
  X,
  AlertCircle,
  Info,
  Key,
} from 'lucide-react'
import { apiGet, apiPut } from '@/lib/api'
