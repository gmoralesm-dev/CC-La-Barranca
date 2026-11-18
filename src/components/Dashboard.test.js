import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

describe('[YLD-05] Dashboard Component — Estadísticas y reportes en tiempo real', () => {
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

  test('abre y cierra el modal de memoria histórica del imagotipo', () => {
    render(<Dashboard />);
    const storyBtn = screen.getByRole('button', { name: /historia del imagotipo/i });
    expect(storyBtn).toBeInTheDocument();

    // Modal no debe estar abierto inicialmente
    expect(screen.queryByText(/identidad visual y memoria histórica/i)).not.toBeInTheDocument();

    // Abrir modal
    fireEvent.click(storyBtn);
    expect(screen.getByText(/identidad visual y memoria histórica/i)).toBeInTheDocument();
    expect(screen.getByText(/grammont de la mothe/i)).toBeInTheDocument();

    // Cerrar modal con botón "Entendido"
    const closeBtn = screen.getByRole('button', { name: /entendido/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/identidad visual y memoria histórica/i)).not.toBeInTheDocument();
  });

  test('renderiza acciones rápidas de gestor y llama a onNavigate al hacer clic', () => {
    const handleNavigate = jest.fn();
    render(<Dashboard userRole="administrador" onNavigate={handleNavigate} />);

    expect(screen.getByText(/acciones rápidas de gestión/i)).toBeInTheDocument();
    const familyBtn = screen.getByRole('button', { name: /gestionar familias/i });
    fireEvent.click(familyBtn);
    expect(handleNavigate).toHaveBeenCalledWith('families');
  });
});
