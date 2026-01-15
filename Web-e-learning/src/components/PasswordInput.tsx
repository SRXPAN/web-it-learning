import { useState, forwardRef, InputHTMLAttributes } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showStrength?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/** Password requirements for strength indicator */
const PASSWORD_RULES = [
  { id: 'length', label: 'Мінімум 8 символів', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'Велика літера (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Мала літера (a-z)', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'Цифра (0-9)', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'Спецсимвол (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
] as const

/** Calculate password strength (0-5) */
function getPasswordStrength(password: string): number {
  return PASSWORD_RULES.filter(rule => rule.test(password)).length
}

/** Get strength label and color */
function getStrengthInfo(strength: number): { label: string; color: string; bgColor: string } {
  switch (strength) {
    case 0:
    case 1:
      return { label: 'Слабкий', color: 'text-red-500', bgColor: 'bg-red-500' }
    case 2:
      return { label: 'Середній', color: 'text-yellow-500', bgColor: 'bg-yellow-500' }
    case 3:
      return { label: 'Добрий', color: 'text-blue-500', bgColor: 'bg-blue-500' }
    case 4:
    case 5:
      return { label: 'Сильний', color: 'text-green-500', bgColor: 'bg-green-500' }
    default:
      return { label: '', color: '', bgColor: '' }
  }
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showStrength = false, value, onChange, className = '', ...props }, ref) => {
    const [visible, setVisible] = useState(false)
    const [focused, setFocused] = useState(false)

    const strength = getPasswordStrength(value)
    const strengthInfo = getStrengthInfo(strength)

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
            className={`w-full rounded-xl border px-3 py-2 pr-10 bg-white dark:bg-gray-900 
              border-neutral-200 dark:border-neutral-700
              focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20
              transition-all duration-200 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            aria-label={visible ? 'Сховати пароль' : 'Показати пароль'}
            tabIndex={-1}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Password strength indicator */}
        {showStrength && value.length > 0 && (
          <div className="mt-2 space-y-2">
            {/* Strength bar */}
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    level <= strength ? strengthInfo.bgColor : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                />
              ))}
            </div>
            <p className={`text-xs font-medium ${strengthInfo.color}`}>
              {strengthInfo.label}
            </p>

            {/* Rules checklist (shown when focused) */}
            {focused && (
              <ul className="space-y-1 text-xs">
                {PASSWORD_RULES.map((rule) => {
                  const passed = rule.test(value)
                  return (
                    <li
                      key={rule.id}
                      className={`flex items-center gap-1.5 transition-colors ${
                        passed ? 'text-green-600 dark:text-green-400' : 'text-neutral-500'
                      }`}
                    >
                      {passed ? <Check size={12} /> : <X size={12} />}
                      {rule.label}
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
