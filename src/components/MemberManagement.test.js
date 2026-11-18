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

const setupFirestoreMocks = ({ invokeSnapshot = true, mockMembers = [], mockReceipts = [] } = {}) => {
  let callIndex = 0;
  onSnapshot.mockImplementation((query, callback) => {
    if (invokeSnapshot && typeof callback === 'function') {
      callIndex++;
      // Primer llamado es para 'members', segundo para 'receipts'
      if (callIndex % 2 === 1) {
        callback({ docs: mockMembers });
      } else {
        callback({ docs: mockReceipts });
      }
    }
    return jest.fn();
  });
  getDocs.mockResolvedValue({ docs: [] });
};

describe('[YLD-03] MemberManagement — Núcleo familiar y registro de beneficios', () => {
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

  test('permite registrar menores de 9 años sin requerir cédula y muestra aviso de infante', () => {
    // Proveer un jefe existente para que el botón sea "+ Añadir Miembro" (isHeadForm = false)
    setupFirestoreMocks({
      mockMembers: [
        {
          id: 'jefe-1',
          data: () => ({ memberName: 'Juan Pérez', isHead: true, memberCedula: 'V-11223344' }),
        },
      ],
    });

    const { container } = render(
      <MemberManagement db={mockDb} userId={mockUserId} family={mockFamily} onBack={mockOnBack} />
    );

    // El formulario ahora está en un modal — abrir modal con "+ Añadir Miembro"
    const addBtn = screen.getByRole('button', { name: /\+ añadir miembro/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    // Ahora el modal está abierto — buscar el input de fecha dentro del modal
    const dateInput = container.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();

    const fourYearsAgo = new Date();
    fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4);
    const dateStr = fourYearsAgo.toISOString().split('T')[0];

    fireEvent.change(dateInput, { target: { value: dateStr } });

    // Debe mostrar el aviso contextual de infante / menor de edad
    expect(screen.getByText(/infante \/ menor de edad/i)).toBeInTheDocument();
    expect(screen.getByText(/no posee cédula de identidad/i)).toBeInTheDocument();

    // El input de cédula debe estar deshabilitado para evitar errores involuntarios
    const cedulaInput = screen.getByPlaceholderText(/no aplica \(menor de 9 años\)/i);
    expect(cedulaInput).toBeDisabled();
  });
});
