import { useState, forwardRef, InputHTMLAttributes } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { useTranslation } from '@/i18n/useTranslation'
import clsx from 'clsx'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrength?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/** * Calculate password strength (0-5)
 * Simple heuristic based on rules
 */
function getPasswordStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*]/.test(password)) score++
  return score
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, value, onChange, className = '', ...props }, ref) => {
    const { t } = useTranslation()
    const [visible, setVisible] = useState(false)
    const [focused, setFocused] = useState(false)

    const strength = getPasswordStrength(value)

    const getStrengthInfo = (strength: number) => {
      switch (strength) {
        case 0:
        case 1:
          return { label: t('password.weak', 'Weak'), color: 'text-red-500', bgColor: 'bg-red-500' }
        case 2:
          return { label: t('password.fair', 'Fair'), color: 'text-yellow-500', bgColor: 'bg-yellow-500' }
        case 3:
          return { label: t('password.good', 'Good'), color: 'text-blue-500', bgColor: 'bg-blue-500' }
        case 4:
        case 5:
          return { label: t('password.strong', 'Strong'), color: 'text-green-500', bgColor: 'bg-green-500' }
        default:
          return { label: '', color: '', bgColor: '' }
      }
    }

    const strengthInfo = getStrengthInfo(strength)

    const rules = [
      { id: 'length', label: t('password.rule.length', 'Min 8 characters'), test: (p: string) => p.length >= 8 },
      { id: 'upper', label: t('password.rule.upper', 'Uppercase (A-Z)'), test: (p: string) => /[A-Z]/.test(p) },
      { id: 'lower', label: t('password.rule.lower', 'Lowercase (a-z)'), test: (p: string) => /[a-z]/.test(p) },
      { id: 'number', label: t('password.rule.number', 'Number (0-9)'), test: (p: string) => /\d/.test(p) },
      { id: 'special', label: t('password.rule.special', 'Special char (!@#$)'), test: (p: string) => /[!@#$%^&*]/.test(p) },
    ]

    return (
      <div className="w-full">
        <div className="relative">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={clsx(
              'w-full rounded-xl border px-3 py-3 pr-10 bg-white dark:bg-neutral-900',
              'border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white',
              'placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
              'transition-all duration-200',
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={visible ? t('common.hidePassword', 'Hide password') : t('common.showPassword', 'Show password')}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Password strength indicator */}
        {showStrength && value.length > 0 && (
          <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Strength bar */}
            <div className="flex gap-1.5 h-1.5 w-full">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={clsx(
                    'flex-1 rounded-full transition-all duration-300',
                    level <= strength ? strengthInfo.bgColor : 'bg-neutral-200 dark:bg-neutral-800'
                  )}
                />
              ))}
            </div>
            
            <p className={clsx('text-xs font-medium text-right', strengthInfo.color)}>
              {strengthInfo.label}
            </p>

            {/* Rules checklist (shown when focused or weak) */}
            {(focused || strength < 3) && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs pt-1">
                {rules.map((rule) => {
                  const passed = rule.test(value)
                  return (
                    <li
                      key={rule.id}
                      className={clsx(
                        'flex items-center gap-1.5 transition-colors duration-200',
                        passed ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'
                      )}
                    >
                      {passed ? <Check size={12} className="shrink-0" /> : <X size={12} className="shrink-0" />}
                      <span>{rule.label}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    )
  }
)

PasswordInput.displayName = 'PasswordInput'

export default PasswordInput