import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';


const DeliveryEvents = ({ db, userId }) => {
    const [deliveryEvents, setDeliveryEvents] = useState([]);
    const [currentEvent, setCurrentEvent] = useState(null); // For editing an existing event
    const [eventName, setEventName] = useState('');
    const [eventDate, setEventDate] = useState(''); // Format YYYY-MM-DD
    const [eventDescription, setEventDescription] = useState('');
    const [loadingEvents, setLoadingEvents] = useState(true);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    // useEffect to fetch delivery events in real-time
    useEffect(() => {
        if (!db) {
            setDeliveryEvents([]);
            setLoadingEvents(false);
            return;
        }

        setLoadingEvents(true);
        setError('');

        try {
            const eventsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'deliveries');
            const q = query(eventsCollectionRef, orderBy('eventDate', 'desc')); // Order by date, newest first

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const eventsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setDeliveryEvents(eventsData);
                setLoadingEvents(false);
                console.log("Delivery events loaded:", eventsData);
            }, (firestoreError) => {
                console.error("Error loading delivery events from Firestore:", firestoreError);
                setError("Error al cargar los eventos de entrega: " + firestoreError.message);
                setLoadingEvents(false);
            });

            return () => unsubscribe();

        } catch (e) {
            console.error("Error setting up Firestore listener for delivery events:", e);
            setError("Error al inicializar la carga de eventos de entrega: " + e.message);
            setLoadingEvents(false);
        }
    }, [db]);

    // Function to handle form submission (add or update event)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!eventName || !eventDate || !eventDescription) {
            setError('Nombre, Fecha y Descripción del evento son obligatorios.');
            return;
        }

        const eventData = {
            eventName,
            eventDate,
            eventDescription,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            if (currentEvent) {
                // Update existing event
                const eventDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'deliveries', currentEvent.id);
                await updateDoc(eventDocRef, eventData);
                console.log("Evento de entrega actualizado:", currentEvent.id);
            } else {
                // Add new event
                const eventsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'deliveries');
                await addDoc(eventsCollectionRef, eventData);
                console.log("Nuevo evento de entrega añadido.");
            }
            resetForm();
        } catch (e) {
            console.error("Error saving delivery event:", e);
            setError("Error al guardar el evento de entrega: " + e.message);
        }
    };

    // Function to load event data into the form for editing
    const handleEdit = (event) => {
        setCurrentEvent(event);
        setEventName(event.eventName);
        setEventDate(event.eventDate);
        setEventDescription(event.eventDescription);
        setError('');
    };

    // Function to delete an event (opens confirmation modal)
    const handleDeleteClick = (event) => {
        setEventToDelete(event);
        setShowConfirmModal(true);
    };

    // Function to confirm deletion
    const confirmDelete = async () => {
        if (!eventToDelete) return;
        setError('');
        try {
            const eventDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'deliveries', eventToDelete.id);
            await deleteDoc(eventDocRef);
            console.log("Evento de entrega eliminado:", eventToDelete.id);
            setShowConfirmModal(false);
            setEventToDelete(null);
        } catch (e) {
            console.error("Error deleting delivery event:", e);
            setError("Error al eliminar el evento de entrega: " + e.message);
        }
    };

    // Function to cancel deletion
    const cancelDelete = () => {
        setShowConfirmModal(false);
        setEventToDelete(null);
    };

    // Function to reset the form
    const resetForm = () => {
        setCurrentEvent(null);
        setEventName('');
        setEventDate('');
        setEventDescription('');
        setError('');
    };

    return (
        <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-4">
                Gestión de Eventos de Entrega
            </h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* Formulario de Registro/Edición de Evento */}
            <form onSubmit={handleSubmit} className="bg-indigo-50 p-6 rounded-xl shadow-inner space-y-4 border border-indigo-200">
                <h3 className="text-xl font-semibold text-indigo-600">
                    {currentEvent ? 'Editar Evento de Entrega' : 'Crear Nuevo Evento de Entrega'}
                </h3>
                <input
                    type="text"
                    placeholder="Nombre del Evento (ej: Entrega Julio 2025)"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Fecha del Evento:
                    <input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                        required
                    />
                </label>
                <textarea
                    placeholder="Descripción del Evento (ej: Bolsas CLAP, Campo Soberano, Proteínas)"
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    rows="3"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    required
                ></textarea>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    {currentEvent && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="w-full sm:w-auto bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition duration-300 shadow-md"
                        >
                            Cancelar Edición
                        </button>
                    )}
                    <button
                        type="submit"
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md"
                    >
                        {currentEvent ? 'Actualizar Evento' : 'Crear Evento'}
                    </button>
                </div>
            </form>

            {/* Lista de Eventos de Entrega */}
            <h3 className="text-xl sm:text-2xl font-bold text-indigo-700 mt-8 text-center">
                Eventos de Entrega Registrados ({deliveryEvents.length} en total)
            </h3>
            {loadingEvents ? (
                <div className="text-center text-gray-600 p-4">Cargando eventos...</div>
            ) : deliveryEvents.length === 0 ? (
                <div className="text-center text-gray-500 p-6 border border-dashed border-gray-300 rounded-lg bg-white">
                    No hay eventos de entrega registrados aún. ¡Usa el formulario de arriba para crear uno!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {deliveryEvents.map((event) => (
                        <div key={event.id} className="bg-white rounded-xl shadow-md p-5 space-y-3 border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-900">{event.eventName}</h4>
                            <p className="text-gray-700 text-sm">Fecha: {event.eventDate}</p>
                            <p className="text-gray-700 text-sm">Descripción: {event.eventDescription}</p>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => handleEdit(event)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 shadow-sm"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(event)}
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
                            ¿Estás seguro de que quieres eliminar el evento de entrega "{eventToDelete?.eventName}"? Esta acción no se puede deshacer.
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

export default DeliveryEvents;
