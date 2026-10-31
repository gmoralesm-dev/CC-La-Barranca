// src/utils/validations.js

/**
 * Sanitiza y formatea texto en Title Case (primera letra de cada palabra en mayúscula, resto en minúscula)
 * Limpia espacios múltiples accidentales
 * @param {string} str - Texto a formatear
 * @returns {string}
 */
export const sanitizeCapitalize = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s|['-])\p{L}/gu, (char) => char.toUpperCase());
};

/**
 * Sanitiza texto general (elimina espacios extra y caracteres de control)
 * @param {string} str
 * @returns {string}
 */
export const sanitizeText = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Calcula la edad en años a partir de una fecha (YYYY-MM-DD o Date)
 * @param {string|Date} dob - Fecha de nacimiento
 * @returns {number|null}
 */
export const calculateAgeFromDate = (dob) => {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

/**
 * Valida que un nombre contenga solo letras, espacios, apóstrofes y guiones
 * @param {string} name - Nombre a validar
 * @returns {boolean}
 */
export const validateName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/;
  return regex.test(name.trim());
};

/**
 * Valida y formatea una cédula venezolana (V-XXXXXXXX o E-XXXXXXXX)
 * En Venezuela la edad mínima legal para portar cédula es de 9 años.
 * @param {string} cedula - Cédula a validar
 * @param {string|number|Date} [birthDateOrAge] - Fecha de nacimiento o edad (opcional)
 * @returns {{ isValid: boolean, formatted: string, error?: string }}
 */
export const formatAndValidateCedula = (cedula, birthDateOrAge = null) => {
  if (!cedula) return { isValid: false, formatted: '' };
  
  let clean = cedula.trim().toUpperCase();
  
  // Auto-inserta guión si falta: V22892416 → V-22892416
  if (/^[VE]\d{5,9}$/.test(clean)) {
    clean = clean[0] + '-' + clean.substring(1);
  }
  
  const isValidFormat = /^[VE]-\d{5,9}$/.test(clean);
  if (!isValidFormat) {
    return { isValid: false, formatted: clean, error: 'Formato inválido (ej: V-12345678 o E-12345678)' };
  }

  // Validación de edad mínima para cédula en Venezuela (9 años)
  if (birthDateOrAge !== null && birthDateOrAge !== undefined && birthDateOrAge !== '') {
    let age = null;
    if (typeof birthDateOrAge === 'number') {
      age = birthDateOrAge;
    } else {
      age = calculateAgeFromDate(birthDateOrAge);
    }

    if (age !== null && age < 9) {
      return {
        isValid: false,
        formatted: clean,
        error: 'En Venezuela la edad mínima para poseer cédula es de 9 años'
      };
    }
  }
  
  return { isValid: true, formatted: clean };
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
  const isValid = /^(\+58)?0?[42]\d{9}$/.test(clean) || /^\d{7,11}$/.test(clean);
  
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
  name: Object.assign((val) => validateName(val), {
    validate: validateName,
    message: 'Solo letras, espacios, apóstrofes y guiones permitidos'
  }),
  cedula: Object.assign((val) => formatAndValidateCedula(val), {
    validate: (val) => formatAndValidateCedula(val).isValid,
    message: 'Formato: V-XXXXXXXX o E-XXXXXXXX (ej: V-22892416)'
  }),
  date: Object.assign((val) => validateDate(val), {
    validate: (val) => validateDate(val).isValid,
    message: 'Fecha inválida o futura'
  }),
  phone: Object.assign((val) => validatePhone(val), {
    validate: (val) => validatePhone(val).isValid,
    message: 'Teléfono inválido (ej: 0412-1234567)'
  }),
  required: Object.assign((val, label) => validateRequired(val, label), {
    validate: (val) => validateRequired(val).isValid,
    message: 'Este campo es obligatorio'
  }),
  // Agrega más tipos según necesites
};
