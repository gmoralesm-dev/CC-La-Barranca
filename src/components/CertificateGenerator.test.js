import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CertificateGenerator from './CertificateGenerator';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
  onSnapshot: jest.fn((query, callback) => {
    callback({ docs: [] });
    return () => {};
  }),
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

describe('CertificateGenerator Component', () => {
  const mockDb = {};
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza el título "Generar Constancia de Entrega de Beneficios"', async () => {
    render(<CertificateGenerator db={mockDb} userId={mockUserId} />);
    await waitFor(() => {
      expect(screen.getByText(/generar constancia de entrega de beneficios/i)).toBeInTheDocument();
    });
  });

  test('renderiza el select con la opción por defecto "-- Selecciona un Evento --"', async () => {
    render(<CertificateGenerator db={mockDb} userId={mockUserId} />);
    await waitFor(() => {
      expect(screen.getByText('-- Selecciona un Evento --')).toBeInTheDocument();
    });
  });

  test('el botón "Generar Constancia" está deshabilitado cuando no hay evento seleccionado', async () => {
    render(<CertificateGenerator db={mockDb} userId={mockUserId} />);
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /generar constancia/i });
      expect(button).toBeDisabled();
    });
  });

  test('el botón "Generar Constancia" está deshabilitado mientras carga', async () => {
    render(<CertificateGenerator db={mockDb} userId={mockUserId} />);
    const button = screen.getByRole('button', { name: /generar constancia/i });
    expect(button).toBeDisabled();
  });
});