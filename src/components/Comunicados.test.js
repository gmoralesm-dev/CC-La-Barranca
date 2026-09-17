import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Comunicados from './Comunicados';
import { onSnapshot } from 'firebase/firestore';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((...args) => {
    if (args.length === 1 && args[0] && args[0].path) {
      return { path: args[0].path + '/comments' };
    }
    return { path: args.filter(Boolean).join('/') };
  }),
  addDoc: jest.fn(),
  onSnapshot: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] })),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((ref) => ref),
  orderBy: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../firebase', () => ({
  db: {},
  COLLECTION: 'Consejo-Comunal-La-Barranca',
  DATA_DOCUMENT: 'data',
}));

const mockEmptyPosts = () => {
  onSnapshot.mockImplementation((query, callback) => {
    if (typeof callback === 'function') {
      callback({ docs: [] });
    }
    return jest.fn();
  });
};

const mockOnePost = () => {
  let callCount = 0;
  onSnapshot.mockImplementation((queryOrRef, callback) => {
    if (typeof callback === 'function') {
      callCount += 1;
      if (callCount === 1) {
        callback({
          docs: [
            {
              id: 'post-1',
              ref: { path: 'comunicados/post-1' },
              data: () => ({
                content: 'Hola comunidad',
                authorName: 'Admin',
                createdAt: { toDate: () => new Date('2026-01-01') },
              }),
            },
          ],
        });
      } else {
        callback({ docs: [] });
      }
    }
    return jest.fn();
  });
};

describe('Comunicados Component', () => {
  const mockUserId = 'test-user-id';
  const mockUserFullName = 'Test User';

  beforeEach(() => {
    jest.clearAllMocks();
    mockEmptyPosts();
  });

  test('renderiza el título "Comunicados de la Comunidad"', () => {
    render(
      <Comunicados userId={mockUserId} userRole="administrador" userFullName={mockUserFullName} />
    );
    expect(screen.getByText('Comunicados de la Comunidad')).toBeInTheDocument();
  });

  test('muestra el formulario "Crear Nuevo Comunicado" cuando userRole es administrador', () => {
    render(
      <Comunicados userId={mockUserId} userRole="administrador" userFullName={mockUserFullName} />
    );
    expect(screen.getByText(/crear nuevo comunicado/i)).toBeInTheDocument();
  });

  test('no muestra el formulario "Crear Nuevo Comunicado" cuando userRole es guest', () => {
    render(
      <Comunicados userId={mockUserId} userRole="guest" userFullName={mockUserFullName} />
    );
    expect(screen.queryByText(/crear nuevo comunicado/i)).not.toBeInTheDocument();
  });

  test('renderiza el input de comentario con placeholder "Escribe un comentario..."', () => {
    mockOnePost();
    render(
      <Comunicados userId={mockUserId} userRole="administrador" userFullName={mockUserFullName} />
    );
    expect(screen.getByPlaceholderText('Escribe un comentario...')).toBeInTheDocument();
  });
});
