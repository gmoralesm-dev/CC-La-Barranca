import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';
import { sanitizeCapitalize } from '../utils/validations';
import MemberManagement from './MemberManagement';

// Este componente recibirá las instancias de db y userId como props
const FamilyManagement = ({ db, userId }) => {
    const [families, setFamilies] = useState([]);
    const [newFamilyName, setNewFamilyName] = useState('');
    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [familyToDelete, setFamilyToDelete] = useState(null);
    const [selectedFamily, setSelectedFamily] = useState(null);

    // Estado para el modal de gestión de bombonas por familia
    const [familyForBombonas, setFamilyForBombonas] = useState(null);
    const [modalBombonasList, setModalBombonasList] = useState([]);
    const [savingBombonas, setSavingBombonas] = useState(false);
    const [showFamilyHelp, setShowFamilyHelp] = useState(false);

    // useEffect para obtener las familias en tiempo real
    useEffect(() => {
        if (!db) {
            setFamilies([]);
            setLoadingFamilies(false);
            return;
        }

        setLoadingFamilies(true);
        setError('');

        try {
            const familiesCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families');
            const q = query(familiesCollectionRef, orderBy('familyName', 'asc'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const familiesData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setFamilies(familiesData);
                setLoadingFamilies(false);
            }, (firestoreError) => {
                setError("Error al cargar las familias: " + firestoreError.message);
                setLoadingFamilies(false);
            });

            return () => unsubscribe();

        } catch (e) {
            setError("Error al inicializar la carga de familias: " + e.message);
            setLoadingFamilies(false);
        }
    }, [db]);

    // Función para añadir nueva familia (formulario limpio y rápido)
    const handleAddFamily = async (e) => {
        e.preventDefault();
        setError('');

        const cleanFamilyName = sanitizeCapitalize(newFamilyName);
        if (!cleanFamilyName) {
            setError('El nombre de la familia es obligatorio.');
            return;
        }

        const familyData = {
            familyName: cleanFamilyName,
            bombonas: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            const familiesCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families');
            await addDoc(familiesCollectionRef, familyData);
            setNewFamilyName('');
        } catch (e) {
            setError("Error al guardar la familia: " + e.message);
        }
    };

    // Función para formatear el tamaño de bombona asegurando la unidad 'kg'
    const formatBombonaTamano = (val) => {
        if (!val) return 'S/T';
        const str = String(val).trim();
        return str.toLowerCase().endsWith('kg') ? str : `${str}kg`;
    };

    // Funciones para gestionar bombonas desde el modal de la familia
    const handleOpenBombonasModal = (family) => {
        setFamilyForBombonas(family);
        const list = Array.isArray(family.bombonas) ? family.bombonas.map(b => ({
            ...b,
            tamano: b.tamano ? formatBombonaTamano(b.tamano) : ''
        })) : [];
        setModalBombonasList(list);
    };

    const handleCloseBombonasModal = () => {
        setFamilyForBombonas(null);
        setModalBombonasList([]);
    };

    const handleAddModalBombona = () => {
        setModalBombonasList([...modalBombonasList, { tamano: '10kg', condicion: 'Buen estado' }]);
    };

    const handleUpdateModalBombona = (index, field, value) => {
        const updatedList = modalBombonasList.map((bombona, i) =>
            i === index ? { ...bombona, [field]: value } : bombona
        );
        setModalBombonasList(updatedList);
    };

    const handleRemoveModalBombona = (index) => {
        const updatedList = modalBombonasList.filter((_, i) => i !== index);
        setModalBombonasList(updatedList);
    };

    const handleSaveBombonas = async () => {
        if (!familyForBombonas) return;
        setSavingBombonas(true);
        setError('');
        try {
            const familyDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', familyForBombonas.id);
            await updateDoc(familyDocRef, {
                bombonas: modalBombonasList,
                updatedAt: Date.now()
            });
            handleCloseBombonasModal();
        } catch (e) {
            setError("Error al guardar bombonas: " + e.message);
        } finally {
            setSavingBombonas(false);
        }
    };

    // Función para eliminar una familia (abre modal de confirmación)
    const handleDeleteClick = (family) => {
        setFamilyToDelete(family);
        setShowConfirmModal(true);
    };

    // Función para confirmar la eliminación
    const confirmDelete = async () => {
        if (!familyToDelete) return;
        setError('');
        try {
            const familyDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', familyToDelete.id);
            await deleteDoc(familyDocRef);
            setShowConfirmModal(false);
            setFamilyToDelete(null);
        } catch (e) {
            setError("Error al eliminar la familia: " + e.message);
        }
    };

    // Función para cancelar la eliminación
    const cancelDelete = () => {
        setShowConfirmModal(false);
        setFamilyToDelete(null);
    };

    // Función para manejar la visualización de miembros de una familia
    const handleViewMembers = (family) => {
        setSelectedFamily(family);
    };

    // Si hay una familia seleccionada, renderiza el componente de gestión de miembros
    if (selectedFamily) {
        return (
            <MemberManagement
                db={db}
                userId={userId}
                family={selectedFamily}
                onBack={() => setSelectedFamily(null)}
            />
        );
    }

    return (
        <div className="space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center">
                Gestión de Familias
            </h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* Formulario Limpio y Rápido para Añadir Familia */}
            <form onSubmit={handleAddFamily} className="bg-white p-6 rounded-xl shadow-md space-y-4 border border-indigo-200">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-semibold text-indigo-600">
                            Registrar Nueva Familia
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowFamilyHelp(!showFamilyHelp)}
                            className="p-1 rounded-full text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 transition text-base"
                            title="Información sobre gestión de familias"
                        >
                            💡
                        </button>
                    </div>
                    {showFamilyHelp && (
                        <div className="text-xs text-indigo-900 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center justify-between gap-2">
                            <span>Las bombonas e integrantes se gestionan individualmente en cada familia registrada.</span>
                            <button
                                type="button"
                                onClick={() => setShowFamilyHelp(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold ml-1 text-xs"
                                title="Cerrar aviso"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        placeholder="Nombre de la Familia"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        onBlur={() => {
                            if (newFamilyName) setNewFamilyName(sanitizeCapitalize(newFamilyName));
                        }}
                        className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md font-semibold whitespace-nowrap"
                    >
                        ➕ Añadir Familia
                    </button>
                </div>
            </form>

            {/* Lista de Familias */}
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-700 mt-8 text-center">
                Familias Registradas
            </h3>
            {loadingFamilies ? (
                <div className="text-center text-gray-600 p-4">Cargando familias...</div>
            ) : families.length === 0 ? (
                <div className="text-center text-gray-500 p-6 border border-dashed border-gray-300 rounded-lg bg-white">
                    No hay familias registradas aún. ¡Usa el formulario de arriba para añadir una!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {families.map((family) => (
                        <div key={family.id} className="bg-white rounded-xl shadow-md p-5 space-y-3 border border-gray-200 hover:shadow-lg transition">
                            <div className="flex justify-between items-start">
                                <h4 className="text-lg font-bold text-gray-900">{family.familyName}</h4>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                                    ID: {family.id ? family.id.slice(0, 6) : '---'}
                                </span>
                            </div>

                            {/* Resumen de Bombonas */}
                            <div className="flex items-center gap-2 text-sm text-gray-700 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100">
                                <span className="font-semibold text-indigo-900">🔥 Cilindros GLP:</span>
                                {family.bombonas && family.bombonas.length > 0 ? (
                                    <span className="font-medium text-indigo-800">
                                        {family.bombonas.length} {family.bombonas.length === 1 ? 'bombona' : 'bombonas'}
                                        <span className="text-gray-500 text-xs ml-1">
                                            ({family.bombonas.map(b => formatBombonaTamano(b.tamano)).join(', ')})
                                        </span>
                                    </span>
                                ) : (
                                    <span className="text-gray-500 text-xs italic">Sin cilindros asignados</span>
                                )}
                            </div>

                            {/* Botones de Acción en fila: Bombonas | Ver Miembros | Eliminar */}
                            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => handleOpenBombonasModal(family)}
                                    className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-sm flex items-center gap-1.5 text-sm font-semibold"
                                    title="Gestionar cilindros de gas de la familia"
                                >
                                    <span>🔥</span>
                                    <span>Bombonas ({family.bombonas?.length || 0})</span>
                                </button>
                                <button
                                    onClick={() => handleViewMembers(family)}
                                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition duration-300 shadow-sm flex items-center gap-1.5 text-sm font-semibold"
                                    title="Ver o agregar miembros familiares"
                                >
                                    <span>👥</span>
                                    <span>Ver Miembros</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(family)}
                                    className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition duration-300 shadow-sm flex items-center gap-1.5 text-sm font-semibold"
                                    title="Eliminar familia"
                                >
                                    <span>🗑️</span>
                                    <span>Eliminar</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para Gestión de Bombonas de la Familia */}
            {familyForBombonas && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4 border border-indigo-100">
                        <div className="flex justify-between items-start border-b pb-3">
                            <div>
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Censo de Servicios</span>
                                <h3 className="text-xl font-bold text-gray-900">
                                    🔥 Gestión de Bombonas
                                </h3>
                                <p className="text-sm text-gray-600 font-medium">Familia: {familyForBombonas.familyName}</p>
                            </div>
                            <button
                                onClick={handleCloseBombonasModal}
                                className="text-gray-400 hover:text-gray-700 text-2xl font-bold p-1 leading-none"
                            >
                                ✕
                            </button>
                        </div>

                        {modalBombonasList.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                                No hay bombonas asignadas a esta familia todavía. Haz clic en "Añadir Bombona" para registrar una.
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                                {modalBombonasList.map((bombona, index) => (
                                    <div key={index} className="flex flex-col sm:flex-row gap-2 items-center bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                                        <span className="font-bold text-indigo-900 text-sm whitespace-nowrap">
                                            #{index + 1}:
                                        </span>
                                        <select
                                            value={bombona.tamano}
                                            onChange={(e) => handleUpdateModalBombona(index, 'tamano', e.target.value)}
                                            className="w-full sm:w-1/2 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        >
                                            <option value="">Seleccionar Tamaño</option>
                                            <option value="10kg">10 kg (Pequeña)</option>
                                            <option value="18kg">18 kg (Mediana)</option>
                                            <option value="43kg">43 kg (Grande)</option>
                                        </select>
                                        <select
                                            value={bombona.condicion}
                                            onChange={(e) => handleUpdateModalBombona(index, 'condicion', e.target.value)}
                                            className="w-full sm:w-1/2 p-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                        >
                                            <option value="">Condición</option>
                                            <option value="Buen estado">Buen estado</option>
                                            <option value="Deteriorada">Deteriorada</option>
                                            <option value="Vacía">Vacía</option>
                                            <option value="Llena">Llena</option>
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveModalBombona(index)}
                                            className="bg-red-100 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition text-xs font-bold"
                                            title="Quitar bombona"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleAddModalBombona}
                            className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
                        >
                            <span>➕</span> Añadir Bombona
                        </button>

                        <div className="flex justify-end gap-3 pt-3 border-t">
                            <button
                                type="button"
                                onClick={handleCloseBombonasModal}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-semibold"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBombonas}
                                disabled={savingBombonas}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-bold shadow-md disabled:opacity-50"
                            >
                                {savingBombonas ? 'Guardando...' : 'Guardar Bombonas'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
                        <h3 className="text-xl font-semibold text-gray-800">Confirmar Eliminación</h3>
                        <p className="text-gray-600">
                            ¿Estás seguro de que quieres eliminar la familia de "<span className="font-bold">{familyToDelete?.familyName}</span>"? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={cancelDelete}
                                className="bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 transition duration-300"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition duration-300"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FamilyManagement;
