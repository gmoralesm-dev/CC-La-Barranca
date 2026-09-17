import {
  validateName,
  formatAndValidateCedula,
  validateDate,
  validatePhone,
  validateRequired,
} from './validations';

describe('validateName', () => {
  test('acepta nombres válidos con letras y espacios', () => {
    expect(validateName('Gabriel Morales')).toBe(true);
    expect(validateName('María José')).toBe(true);
    expect(validateName("O'Brien")).toBe(true);
  });

  test('rechaza nombres con números o caracteres especiales', () => {
    expect(validateName('Gabriel123')).toBe(false);
    expect(validateName('Test@email')).toBe(false);
    expect(validateName('')).toBe(false);
  });
});

describe('formatAndValidateCedula', () => {
  test('valida cédulas con formato correcto', () => {
    expect(formatAndValidateCedula('V-22892416').isValid).toBe(true);
    expect(formatAndValidateCedula('E-12345678').isValid).toBe(true);
  });

  test('auto-inserta el guión si falta', () => {
    const result = formatAndValidateCedula('V22892416');
    expect(result.isValid).toBe(true);
    expect(result.formatted).toBe('V-22892416');
  });

  test('rechaza cédulas con formato inválido', () => {
    expect(formatAndValidateCedula('12345678').isValid).toBe(false);
    expect(formatAndValidateCedula('').isValid).toBe(false);
    expect(formatAndValidateCedula('X-12345678').isValid).toBe(false);
  });
});

describe('validateDate', () => {
  test('acepta fechas pasadas válidas', () => {
    expect(validateDate('1995-06-15').isValid).toBe(true);
    expect(validateDate('2000-01-01').isValid).toBe(true);
  });

  test('rechaza fechas futuras', () => {
    expect(validateDate('2099-12-31').isValid).toBe(false);
  });

  test('rechaza fechas vacías o inválidas', () => {
    expect(validateDate('').isValid).toBe(false);
    expect(validateDate('no-es-fecha').isValid).toBe(false);
  });
});

describe('validatePhone', () => {
  test('acepta teléfonos venezolanos válidos', () => {
    expect(validatePhone('04121234567').isValid).toBe(true);
    expect(validatePhone('+584121234567').isValid).toBe(true);
  });

  test('rechaza teléfonos vacíos', () => {
    expect(validatePhone('').isValid).toBe(false);
  });
});

describe('validateRequired', () => {
  test('rechaza valores vacíos, nulos o undefined', () => {
    expect(validateRequired('').isValid).toBe(false);
    expect(validateRequired(null).isValid).toBe(false);
    expect(validateRequired(undefined).isValid).toBe(false);
    expect(validateRequired('   ').isValid).toBe(false);
  });

  test('acepta valores con contenido', () => {
    expect(validateRequired('texto').isValid).toBe(true);
    expect(validateRequired(0).isValid).toBe(true);
  });
});
