import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mockear todos los componentes hijos para evitar que carguen dependencias adicionales
jest.mock('./components/FamilyManagement', () => () => <div>FamilyManagement</div>);
jest.mock('./components/DeliveryEvents', () => () => <div>DeliveryEvents</div>);
jest.mock('./components/Reports', () => () => <div>Reports</div>);
jest.mock('./components/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('./components/Comunicados', () => () => <div>Comunicados</div>);

// Mock del asset de imagen
jest.mock('./assets/logo-cc-la-barranca.png', () => 'logo-mock.png');

// Mock de firebase.js
jest.mock('./firebase', () => ({
  db: {},
  auth: {},
  COLLECTION: 'Consejo-Comunal-La-Barranca',
  DATA_DOCUMENT: 'data',
  USERS_COLLECTION: 'users',
  INVITADOS_COLLECTION: 'invitados',
}));

// Mock de firebase/auth
jest.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, callback) => {
    if (typeof callback === 'function') {
      callback(null); // Simula usuario no autenticado
    }
    return () => {}; // función unsubscribe
  },
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  signInAnonymously: jest.fn(),
  getAuth: jest.fn(() => ({})),
}));

// Mock de firebase/firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getFirestore: jest.fn(() => ({})),
}));

import App from './App';

describe('App — Pantalla de Login', () => {
  test('renderiza el formulario de login con email, contraseña y botones', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar como Invitado' })).toBeInTheDocument();
  });

  test('muestra el nombre del Consejo Comunal en la pantalla de login', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Consejo Comunal/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/La Barranca/i)).toBeInTheDocument();
  });
});
