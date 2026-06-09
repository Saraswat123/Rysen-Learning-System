import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export default function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-semibold text-charcoal">{label}</label>}
      <input
        {...props}
        className={`w-full px-4 py-2.5 border rounded-lg text-charcoal bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-midnight focus:border-transparent transition ${error ? 'border-red-500' : 'border-gray-300'} ${className}`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
