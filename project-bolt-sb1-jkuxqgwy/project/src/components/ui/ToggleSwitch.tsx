interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export default function ToggleSwitch({ checked, onChange, label, disabled = false }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-success-500' : 'bg-surface-700'
      }`}
    >
      <span
        className={`h-6 w-6 rounded-full bg-cream-50 shadow-md transition-transform duration-300 ease-out ${
          checked ? '-translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
