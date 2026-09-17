import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DeliveryEvents from './DeliveryEvents';

const mockUnsubscribe = jest.fn();

// Mock de Firebase Firestore
jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn(),
    addDoc: jest.fn(),
    onSnapshot: (query, callback) => {
      if (typeof callback === 'function') {
        callback({ docs: [] });
      }
      return () => {};
    },
    doc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    orderBy: jest.fn(),
    getFirestore: jest.fn(() => ({})),
  };
});




jest.mock('../firebase', () => ({
  COLLECTION: 'Consejo-Comunal-La-Barranca',
  DATA_DOCUMENT: 'data',
}));

describe('DeliveryEvents — Validación de formulario', () => {
  test('muestra error si se intenta crear un evento con campos vacíos', async () => {


    const mockDb = {};
    render(<DeliveryEvents db={mockDb} userId="test-uid" />);

    // Busca y hace click en el botón Crear Evento sin llenar los campos
    const submitButton = screen.getByRole('button', { name: 'Crear Evento' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Nombre, Fecha y Descripción del evento son obligatorios.')
      ).toBeInTheDocument();
    });
  });

  test('renderiza el formulario con los campos nombre, fecha y descripción', () => {
    const mockDb = {};
    render(<DeliveryEvents db={mockDb} userId="test-uid" />);

    expect(
      screen.getByPlaceholderText(/Nombre del Evento/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/Descripción del Evento/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText('Fecha del Evento:')
    ).toBeInTheDocument();
  });

  test('muestra el estado vacío cuando no hay eventos registrados', () => {
    const mockDb = {};
    render(<DeliveryEvents db={mockDb} userId="test-uid" />);

    expect(
      screen.getByText(/No hay eventos de entrega registrados aún/i)
    ).toBeInTheDocument();
  });
});

