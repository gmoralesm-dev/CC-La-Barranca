// src/utils/validations.js

/**
 * Valida que un nombre contenga solo letras, espacios, apóstrofes y guiones
 * @param {string} name - Nombre a validar
 * @returns {boolean}
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'\-]+$/;
  return regex.test(name.trim());
};

/**
 * Valida y formatea una cédula venezolana (V-XXXXXXXX o E-XXXXXXXX)
 * @param {string} cedula - Cédula a validar
 * @returns {{ isValid: boolean, formatted: string }}
 */
export const formatAndValidateCedula = (cedula) => {
  if (!cedula) return { isValid: false, formatted: '' };
  
  let clean = cedula.trim().toUpperCase();
  
  // Auto-inserta guión si falta: V22892416 → V-22892416
  if (/^[VE]\d{5,9}$/.test(clean)) {
    clean = clean[0] + '-' + clean.substring(1);
  }
  
  const isValid = /^[VE]-\d{5,9}$/.test(clean);
  return { isValid, formatted: isValid ? clean : clean };
};

/**
 * Valida que una fecha sea válida y no sea futura
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateDate = (dateStr) => {
  if (!dateStr) return { isValid: false, error: 'La fecha es requerida' };
  
  const date = new Date(dateStr);
  const today = new Date();
  
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Fecha inválida' };
  }
  
  if (date > today) {
    return { isValid: false, error: 'La fecha no puede ser futura' };
  }
  
  // Edad mínima/máxima opcional (ej: 0-120 años)
  const age = today.getFullYear() - date.getFullYear();
  if (age < 0 || age > 120) {
    return { isValid: false, error: 'Edad fuera de rango válido' };
  }
  
  return { isValid: true };
};

/**
 * Valida un teléfono venezolano (formato flexible)
 * @param {string} phone - Teléfono a validar
 * @returns {{ isValid: boolean, formatted: string }}
 */
export const validatePhone = (phone) => {
  if (!phone) return { isValid: false, formatted: '' };
  
  // Remueve todo excepto dígitos y +
  const clean = phone.replace(/[^\d+]/g, '');
  
  // Patrones válidos: 04121234567, +584121234567, 02121234567
  const isValid = /^(\+58)?0[4|2]\d{9}$/.test(clean) || /^\d{7,11}$/.test(clean);
  
  // Formato bonito para mostrar: 0412-1234567
  const formatted = clean.replace(/(\d{4})(\d{7})/, '$1-$2');
  
  return { isValid, formatted };
};

/**
 * Validador genérico para campos requeridos
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo para el mensaje de error
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateRequired = (value, fieldName = 'Campo') => {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { isValid: false, error: `${fieldName} es requerido` };
  }
  return { isValid: true };
};

/**
 * Mapa de validadores por tipo de campo (para uso dinámico)
 */
export const VALIDATORS = {
  name: {
    validate: validateName,
    message: 'Solo letras, espacios, apóstrofes y guiones permitidos'
  },
  cedula: {
    validate: (val) => formatAndValidateCedula(val).isValid,
    message: 'Formato: V-XXXXXXXX o E-XXXXXXXX (ej: V-22892416)'
  },
  date: {
    validate: (val) => validateDate(val).isValid,
    message: 'Fecha inválida o futura'
  },
  phone: {
    validate: (val) => validatePhone(val).isValid,
    message: 'Teléfono inválido (ej: 0412-1234567)'
  },
  required: {
    validate: (val) => validateRequired(val).isValid,
    message: 'Este campo es obligatorio'
  },
  // Agrega más tipos según necesites
};
