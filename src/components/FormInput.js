// src/components/FormInput.js
import React from 'react';

/**
 * Input reutilizable con validación visual integrada
 * @param {Object} props - { label, name, value, onChange, onBlur, error, type, required, placeholder, ...rest }
 */
const FormInput = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  type = 'text',
  required = false,
  placeholder = '',
  className = '',
  ...rest
}) => {
  const baseClasses = "w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition";
  const stateClasses = error 
    ? "border-red-300 focus:ring-red-500 bg-red-50" 
    : "border-gray-300 focus:ring-indigo-500";
  
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-gray-700 text-sm font-bold">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => onBlur?.(name)}
        placeholder={placeholder}
        className={`${baseClasses} ${stateClasses}`}
        required={required}
        {...rest}
      />
      
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
