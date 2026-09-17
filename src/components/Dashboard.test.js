import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Dashboard from './Dashboard';
import { onSnapshot } from 'firebase/firestore';

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

const mockOnSnapshot = () => {
  onSnapshot.mockImplementation((query, callback) => {
    if (typeof callback === 'function') {
      callback({ docs: [], size: 0 });
    }
    return jest.fn();
  });
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot();
  });

  test('renderiza el título "Consejo Comunal La Barranca"', () => {
    render(<Dashboard />);
    expect(screen.getByRole('heading', { name: /consejo comunal la barranca/i })).toBeInTheDocument();
  });

  test('renderiza la tarjeta "Familias Registradas" con valor inicial 0', () => {
    render(<Dashboard />);
    expect(screen.getByText(/familias registradas/i)).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  test('renderiza la tarjeta "Entregas Realizadas" con valor inicial 0', () => {
    render(<Dashboard />);
    expect(screen.getByText(/entregas realizadas/i)).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  test('renderiza la tarjeta "Comunicados Activos" con valor inicial 0', () => {
    render(<Dashboard />);
    expect(screen.getByText(/comunicados activos/i)).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  test('renderiza el texto "Sincronización en tiempo real activa"', () => {
    render(<Dashboard />);
    expect(screen.getByText(/sincronización en tiempo real activa/i)).toBeInTheDocument();
  });
});
