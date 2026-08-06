// src/hooks/useValidatedForm.js
import { useState, useCallback } from 'react';
import { VALIDATORS, validateRequired } from '../utils/validations';

/**
 * Hook para manejar validaciones de formularios de forma reutilizable
 * @param {Object} initialData - Valores iniciales del formulario
 * @param {Object} validationRules - Reglas de validación por campo
 * @returns {Object} Estado y funciones para manejar el form
 */
export const useValidatedForm = (initialData = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Actualiza un campo y lo valida automáticamente
  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Si el campo ya fue "tocado", valida en tiempo real
    if (touched[fieldName]) {
      validateField(fieldName, value);
    }
  }, [touched]);

  // Marca un campo como "tocado" (cuando el usuario sale del input)
  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, values[fieldName]);
  }, [values]);

  // Valida un campo individualmente
  const validateField = useCallback((fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return true;

    let isValid = true;
    let errorMsg = '';

    // 1. Validar requerido (si aplica)
    if (rules.required) {
      const req = validateRequired(value, rules.label || fieldName);
      if (!req.isValid) {
        isValid = false;
        errorMsg = req.error;
      }
    }

    // 2. Validar tipo (name, cedula, date, etc.)
    if (isValid && rules.type && VALIDATORS[rules.type]) {
      const validator = VALIDATORS[rules.type];
      if (!validator.validate(value)) {
        isValid = false;
        errorMsg = validator.message;
      }
    }

    // 3. Validador personalizado (si existe)
    if (isValid && rules.customValidator) {
      const custom = rules.customValidator(value, values);
      if (!custom.isValid) {
        isValid = false;
        errorMsg = custom.error;
      }
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: isValid ? '' : errorMsg
    }));

    return isValid;
  }, [validationRules, values]);

  // Valida TODO el formulario
  const validateAll = useCallback(() => {
    let allValid = true;
    
    Object.keys(validationRules).forEach(fieldName => {
      const fieldValid = validateField(fieldName, values[fieldName]);
      if (!fieldValid) allValid = false;
      setTouched(prev => ({ ...prev, [fieldName]: true })); // Marcar todos como touched
    });
    
    return allValid;
  }, [validateField, validationRules, values]);

  // Resetear formulario
  const reset = useCallback((newValues = {}) => {
    setValues(newValues || initialData);
    setErrors({});
    setTouched({});
  }, [initialData]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateField,
    validateAll,
    reset,
    setValues // útil para editar (prefill)
  };
};
