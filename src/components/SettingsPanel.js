// src/components/SettingsPanel.js
import React, { useState, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTION, DATA_DOCUMENT, USERS_COLLECTION, INVITADOS_COLLECTION } from '../firebase';
import { sanitizeCapitalize } from '../utils/validations';

const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

const SettingsPanel = ({
  userId,
  userRole,
  userEmail,
  displayName,
  setDisplayName,
  avatarUrl,
  setAvatarUrl,
  onSignOut
}) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // States for name editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState(false);

  const dropdownRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync current display name to input when opening edit mode
  useEffect(() => {
    if (isEditingName) {
      setNameInput(displayName || '');
      setNameError('');
      setNameSuccess(false);
    }
  }, [isEditingName, displayName]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setIsEditingName(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isGuest = userRole === 'guest';

  // Upload image to Cloudinary (unsigned) and save URL to Firestore
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      setUploadError('Cloudinary no está configurado. Agrega REACT_APP_CLOUDINARY_CLOUD_NAME y REACT_APP_CLOUDINARY_UPLOAD_PRESET a .env.local');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      // 1. Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', 'cc-la-barranca/avatars');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      if (!res.ok) throw new Error('Error al subir la imagen a Cloudinary');

      const data = await res.json();
      const newUrl = data.secure_url;

      // 2. Save URL to Firestore (in the user's own document)
      const collectionName = isGuest ? INVITADOS_COLLECTION : USERS_COLLECTION;
      const userDocRef = doc(db, COLLECTION, DATA_DOCUMENT, collectionName, userId);
      await updateDoc(userDocRef, { avatarUrl: newUrl });

      // 3. Update local state so avatar refreshes immediately
      setAvatarUrl(newUrl);
    } catch (err) {
      console.error('Avatar upload error:', err);
      setUploadError('No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save display name to Firestore
  const handleSaveDisplayName = async (e) => {
    e.preventDefault();
    const cleanName = sanitizeCapitalize(nameInput);
    if (!cleanName) {
      setNameError('El nombre no puede estar vacío');
      return;
    }

    setSavingName(true);
    setNameError('');
    try {
      const collectionName = isGuest ? INVITADOS_COLLECTION : USERS_COLLECTION;
      const userDocRef = doc(db, COLLECTION, DATA_DOCUMENT, collectionName, userId);
      
      const payload = isGuest 
        ? { displayName: cleanName, fullName: cleanName } 
        : { displayName: cleanName, nombre: cleanName };
      
      await updateDoc(userDocRef, payload);

      setDisplayName(cleanName);
      setNameSuccess(true);
      setTimeout(() => {
        setIsEditingName(false);
        setNameSuccess(false);
      }, 700);
    } catch (err) {
      console.error('Error updating name:', err);
      setNameError('No se pudo guardar el nombre.');
    } finally {
      setSavingName(false);
    }
  };

  // Avatar display: user photo or fallback initials
  const effectiveName = displayName || userEmail || '?';
  const initials = effectiveName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ⚙️ Settings trigger button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
        title="Ajustes"
        aria-label="Abrir ajustes de usuario"
      >
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-9 w-9 rounded-full object-cover border-2 border-indigo-300"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm border-2 border-indigo-300">
              {initials}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black bg-opacity-40 flex items-center justify-center">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Gear icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full object-cover border-2 border-indigo-300" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {initials}
              </div>
            )}
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-bold text-gray-800 truncate">{effectiveName}</p>
              {displayName && userEmail && (
                <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
              )}
              <p className="text-xs text-indigo-500 uppercase font-semibold">{userRole || '—'}</p>
            </div>
          </div>

          <div className="p-2 space-y-1">
            {/* Edit Display Name Toggle / Form */}
            {!isEditingName ? (
              <button
                onClick={() => setIsEditingName(true)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>Cambiar nombre visible</span>
              </button>
            ) : (
              <form onSubmit={handleSaveDisplayName} className="p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                <label className="block text-xs font-semibold text-gray-600">Nuevo nombre visible:</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ej: Gabriel"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                  autoFocus
                />
                {nameError && <p className="text-xs text-red-500">{nameError}</p>}
                {nameSuccess && <p className="text-xs text-green-600 font-semibold">¡Nombre actualizado!</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingName}
                    className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 font-semibold disabled:opacity-50"
                  >
                    {savingName ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            )}

            {/* Change profile picture */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                id="avatar-upload-input"
              />
              <label
                htmlFor="avatar-upload-input"
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {uploading ? 'Subiendo imagen...' : 'Cambiar foto de perfil'}
              </label>
              {uploadError && (
                <p className="text-xs text-red-500 px-3 pb-1">{uploadError}</p>
              )}
            </div>

            <div className="border-t border-gray-100 my-1" />

            {/* Sign out */}
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
