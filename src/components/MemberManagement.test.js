import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MemberManagement from './MemberManagement';
import { onSnapshot, getDocs } from 'firebase/firestore';

jest.mock('../utils/validations', () => ({
  VALIDATORS: {
    name: { validate: jest.fn(() => true), message: '' },
    cedula: { validate: jest.fn(() => true), message: '' },
    date: { validate: jest.fn(() => true), message: '' },
    phone: { validate: jest.fn(() => true), message: '' },
  },
  formatAndValidateCedula: jest.fn(() => ({ isValid: true, formatted: 'V-12345678' })),
  validateRequired: jest.fn(() => ({ isValid: true })),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../firebase', () => ({
  db: {},
  COLLECTION: 'Consejo-Comunal-La-Barranca',
  DATA_DOCUMENT: 'data',
}));

const setupFirestoreMocks = ({ invokeSnapshot = true } = {}) => {
  onSnapshot.mockImplementation((query, callback) => {
    if (invokeSnapshot && typeof callback === 'function') {
      callback({ docs: [] });
    }
    return jest.fn();
  });
  getDocs.mockResolvedValue({ docs: [] });
};

describe('MemberManagement Component', () => {
  const mockDb = {};
  const mockUserId = 'test-user-id';
  const mockFamily = { id: 'family-1', familyName: 'FAMILIA TEST' };
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    setupFirestoreMocks();
  });

  test('renderiza el nombre de la familia "FAMILIA TEST" en el título', () => {
    render(
      <MemberManagement db={mockDb} userId={mockUserId} family={mockFamily} onBack={mockOnBack} />
    );
    expect(screen.getByText(/FAMILIA TEST/i)).toBeInTheDocument();
  });

  test('renderiza el botón "Volver"', () => {
    render(
      <MemberManagement db={mockDb} userId={mockUserId} family={mockFamily} onBack={mockOnBack} />
    );
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
  });

  test('al hacer click en "Volver" se llama la función onBack', () => {
    render(
      <MemberManagement db={mockDb} userId={mockUserId} family={mockFamily} onBack={mockOnBack} />
    );
    const volverButton = screen.getByRole('button', { name: /volver/i });
    fireEvent.click(volverButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  test('renderiza el botón para añadir un nuevo integrante', () => {
    render(
      <MemberManagement db={mockDb} userId={mockUserId} family={mockFamily} onBack={mockOnBack} />
    );
    const addButtons = screen.getAllByRole('button');
    const addIntegranteButton = addButtons.find(btn =>
      btn.textContent.toLowerCase().includes('añadir') ||
      btn.textContent.toLowerCase().includes('agregar') ||
      btn.textContent.toLowerCase().includes('nuevo') ||
      btn.textContent.toLowerCase().includes('registrar jefe')
    );
    expect(addIntegranteButton).toBeDefined();
  });

  test('muestra el estado de carga o estado vacío inicial de miembros', () => {
    setupFirestoreMocks({ invokeSnapshot: false });
    render(
      <MemberManagement db={mockDb} userId={mockUserId} family={mockFamily} onBack={mockOnBack} />
    );
    const hasLoadingState = screen.queryByText(/cargando/i);
    const hasEmptyState =
      screen.queryByText(/no hay/i) ||
      screen.queryByText(/agregar/i) ||
      screen.queryByText(/aún no/i) ||
      screen.queryByText(/jefe/i);
    expect(hasLoadingState || hasEmptyState).toBeTruthy();
  });
});
