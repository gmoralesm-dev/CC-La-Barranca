import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';
import MemberManagement from './MemberManagement'; // Importa el componente de gestión de miembros


// Este componente recibirá las instancias de db y userId como props
const FamilyManagement = ({ db, userId }) => {
    const [families, setFamilies] = useState([]);
    const [newFamilyName, setNewFamilyName] = useState('');
    const [bombonasList, setBombonasList] = useState([]);
    const [loadingFamilies, setLoadingFamilies] = useState(true);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [familyToDelete, setFamilyToDelete] = useState(null);
    const [selectedFamily, setSelectedFamily] = useState(null);

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

    // Función para manejar el envío del formulario (añadir nueva familia)
    const handleAddFamily = async (e) => {
        e.preventDefault();
        setError('');

        if (!newFamilyName) {
            setError('El nombre de la familia es obligatorio.');
            return;
        }

        const familyData = {
            familyName: newFamilyName,
            bombonas: bombonasList,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            const familiesCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families');
            await addDoc(familiesCollectionRef, familyData);
            resetForm();
        } catch (e) {
            setError("Error al guardar la familia: " + e.message);
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

    // Función para resetear el formulario
    const resetForm = () => {
        setNewFamilyName('');
        setBombonasList([]);
        setError('');
    };

    // Funciones para gestionar la lista de bombonas
    const handleAddBombona = () => {
        setBombonasList([...bombonasList, { tamano: '', condicion: '' }]);
    };

    const handleUpdateBombona = (index, field, value) => {
        const updatedList = bombonasList.map((bombona, i) =>
            i === index ? { ...bombona, [field]: value } : bombona
        );
        setBombonasList(updatedList);
    };

    const handleRemoveBombona = (index) => {
        const updatedList = bombonasList.filter((_, i) => i !== index);
        setBombonasList(updatedList);
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

            {/* Nuevo Formulario para Añadir Familia */}
            <form onSubmit={handleAddFamily} className="bg-white p-6 rounded-xl shadow-md space-y-4 border border-indigo-200">
                <h3 className="text-xl font-semibold text-indigo-600">
                    Registrar Nueva Familia
                </h3>
                <input
                    type="text"
                    placeholder="Nombre de la Familia"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />

                {/* Sección de Bombonas */}
                <div className="border-t border-indigo-200 pt-4 mt-4 space-y-3">
                    <h4 className="text-lg font-semibold text-indigo-600 mb-3">Gestión de Bombonas</h4>
                    {bombonasList.map((bombona, index) => (
                        <div key={index} className="flex flex-col sm:flex-row gap-3 items-center bg-indigo-100 p-3 rounded-lg border border-indigo-200">
                            <span className="font-medium text-indigo-800">Bombona {index + 1}:</span>
                            <input
                                type="text"
                                placeholder="Tamaño (ej: 10kg, 18kg)"
                                value={bombona.tamano}
                                onChange={(e) => handleUpdateBombona(index, 'tamano', e.target.value)}
                                className="w-full sm:w-1/3 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <select
                                value={bombona.condicion}
                                onChange={(e) => handleUpdateBombona(index, 'condicion', e.target.value)}
                                className="w-full sm:w-1/3 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Condición</option>
                                <option value="Buen estado">Buen estado</option>
                                <option value="Deteriorada">Deteriorada</option>
                                <option value="Vacía">Vacía</option>
                                <option value="Llena">Llena</option>
                            </select>
                            <button
                                type="button"
                                onClick={() => handleRemoveBombona(index)}
                                className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition duration-300 shadow-sm text-sm"
                            >
                                Eliminar
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAddBombona}
                        className="w-full bg-indigo-500 text-white py-2 rounded-lg hover:bg-indigo-600 transition duration-300 shadow-md mt-3"
                    >
                        Añadir Bombona
                    </button>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md"
                    >
                        Añadir Familia
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
                        <div key={family.id} className="bg-white rounded-xl shadow-md p-5 space-y-3 border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900">{family.familyName}</h4>
                            {/* Mostrar información de bombonas */}
                            {family.bombonas && family.bombonas.length > 0 && (
                                <div className="mt-2 text-sm bg-indigo-50 p-2 rounded-md border border-indigo-100">
                                    <p className="font-medium text-indigo-800">Bombonas ({family.bombonas.length}):</p>
                                    {family.bombonas.map((bombona, idx) => (
                                        <p key={idx} className="ml-2">- Bombona {idx + 1}: {bombona.tamano || 'N/A'} - {bombona.condicion || 'N/A'}</p>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => handleViewMembers(family)}
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300 shadow-sm mr-2"
                                >
                                    Ver Miembros
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(family)}
                                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300 shadow-sm"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
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