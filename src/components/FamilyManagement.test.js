import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FamilyManagement from './FamilyManagement';
import { onSnapshot } from 'firebase/firestore';

jest.mock('./MemberManagement', () => () => <div>MemberManagement Mock</div>);

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

const mockOnSnapshotIdle = () => {
  onSnapshot.mockImplementation(() => jest.fn());
};

const mockOnSnapshotEmpty = () => {
  onSnapshot.mockImplementation((query, callback) => {
    if (typeof callback === 'function') {
      callback({ docs: [] });
    }
    return jest.fn();
  });
};

describe('FamilyManagement Component', () => {
  const mockDb = {};
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshotEmpty();
  });

  test('renderiza el título "Gestión de Familias"', () => {
    render(<FamilyManagement db={mockDb} userId={mockUserId} />);
    expect(screen.getByText('Gestión de Familias')).toBeInTheDocument();
  });

  test('renderiza el input con placeholder "Nombre de la Familia"', () => {
    render(<FamilyManagement db={mockDb} userId={mockUserId} />);
    expect(screen.getByPlaceholderText('Nombre de la Familia')).toBeInTheDocument();
  });

  test('renderiza el botón "Añadir Familia"', () => {
    render(<FamilyManagement db={mockDb} userId={mockUserId} />);
    expect(screen.getByRole('button', { name: /añadir familia/i })).toBeInTheDocument();
  });

  test('renderiza el botón "Añadir Bombona"', () => {
    render(<FamilyManagement db={mockDb} userId={mockUserId} />);
    expect(screen.getByRole('button', { name: /añadir bombona/i })).toBeInTheDocument();
  });

  test('muestra "Cargando familias..." inicialmente', () => {
    mockOnSnapshotIdle();
    render(<FamilyManagement db={mockDb} userId={mockUserId} />);
    expect(screen.getByText(/cargando familias/i)).toBeInTheDocument();
  });
});
