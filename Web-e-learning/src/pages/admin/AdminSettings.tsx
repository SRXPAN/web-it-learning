/**
 * Admin Settings Page
 * System configuration and preferences
 */
import { useState } from 'react'
import { useTranslation } from '@/i18n/useTranslation'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { PageHeader } from '@/components/admin/PageHeader'

export default function AdminSettings() {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Placeholder settings - можна розширити пізніше
  const [settings, setSettings] = useState({
    siteName: 'E-Learning Platform',
    maintenanceMode: false,
    allowRegistration: true,
    maxFileSize: 10, // MB
    sessionTimeout: 30, // minutes
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      // TODO: API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      // Error handling
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* WIP Warning */}
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-yellow-600 dark:text-yellow-400 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
              🚧 Work In Progress
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Ця сторінка ще в розробці. Зміни не зберігаються на сервері.
            </p>
          </div>
        </div>
      </div>
      
      {/* Header */}
      <PageHeader
        title={t('admin.settings')}
        description="Налаштування системи та конфігурація"
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saved ? (
              <>
                <CheckCircle2 size={18} />
                Збережено
              </>
            ) : (
              <>
                <Save size={18} />
                {saving ? 'Збереження...' : 'Зберегти'}
              </>
            )}
          </button>
        }
      />

      {/* Settings Form */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
        
        {/* General Settings */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Загальні налаштування
          </h2>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Назва сайту
            </label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg
                       bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                       focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Таймаут сесії (хвилини)
            </label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg
                       bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                       focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="5"
              max="1440"
            />
          </div>
        </div>

        {/* File Upload Settings */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Завантаження файлів
          </h2>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Максимальний розмір файлу (MB)
            </label>
            <input
              type="number"
              value={settings.maxFileSize}
              onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg
                       bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100
                       focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              min="1"
              max="100"
            />
          </div>
        </div>

        {/* Security Settings */}
        <div className="p-6 space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Безпека
          </h2>
          
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.allowRegistration}
              onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Дозволити реєстрацію
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Нові користувачі можуть створювати акаунти
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            />
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                Режим обслуговування
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                Сайт недоступний для користувачів (крім адміністраторів)
              </div>
            </div>
          </label>
        </div>

        {/* Maintenance Mode Warning */}
        {settings.maintenanceMode && (
          <div className="p-6">
            <div className="flex items-start gap-3 p-4 bg-warning-50 dark:bg-warning-950 border border-warning-200 dark:border-warning-800 rounded-lg">
              <AlertCircle className="text-warning-600 dark:text-warning-400 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-medium text-warning-900 dark:text-warning-100">
                  Увага: Режим обслуговування увімкнено
                </h3>
                <p className="text-sm text-warning-700 dark:text-warning-300 mt-1">
                  Звичайні користувачі не зможуть отримати доступ до платформи. Тільки адміністратори матимуть доступ.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
