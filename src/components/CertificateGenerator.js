import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';

const CertificateGenerator = ({ db, userId }) => {
    const [deliveryEvents, setDeliveryEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [familiesReceived, setFamiliesReceived] = useState([]);
    const [familiesNotReceived, setFamiliesNotReceived] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 1. Cargar todos los eventos de entrega disponibles
    useEffect(() => {
        const fetchDeliveryEvents = async () => {
            if (!db) return;
            setLoading(true);
            setError('');
            try {
                const eventsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'deliveries');
                const q = query(eventsCollectionRef, orderBy('eventDate', 'desc'));
                const querySnapshot = await getDocs(q);
                const eventsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setDeliveryEvents(eventsData);
            } catch (e) {
                console.error("Error fetching delivery events:", e);
                setError("Error al cargar los eventos de entrega disponibles.");
            } finally {
                setLoading(false);
            }
        };
        fetchDeliveryEvents();
    }, [db]);

    // 2. Generar la constancia cuando se selecciona un evento
    const generateCertificate = async () => {
        if (!selectedEventId) {
            setError("Por favor, selecciona un evento de entrega para generar la constancia.");
            return;
        }

        setLoading(true);
        setError('');
        setFamiliesReceived([]);
        setFamiliesNotReceived([]);

        try {
            const allFamiliesRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families');
            const allFamiliesSnapshot = await getDocs(allFamiliesRef);
            const allFamiliesData = allFamiliesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const receivedFamilyIds = new Set();
            const familiesThatReceived = [];

            // Iterate over each family to see their receipts for the selected event
            for (const family of allFamiliesData) {
                const receiptsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts');
                // Filtrar los recibos por el evento seleccionado
                const receiptsQuery = query(receiptsCollectionRef, orderBy('receiptDate', 'desc')); // No se puede filtrar por deliveryEventId directamente sin un índice, así que se filtrará en memoria
                const receiptsSnapshot = await getDocs(receiptsQuery);
                const familyReceipts = receiptsSnapshot.docs.map(doc => doc.data());

                const receivedForThisEvent = familyReceipts.some(receipt => receipt.deliveryEventId === selectedEventId);

                if (receivedForThisEvent) {
                    receivedFamilyIds.add(family.id);
                    familiesThatReceived.push(family);
                }
            }

            const familiesThatDidNotReceive = allFamiliesData.filter(family => !receivedFamilyIds.has(family.id));

            setFamiliesReceived(familiesThatReceived);
            setFamiliesNotReceived(familiesThatDidNotReceive);

        } catch (e) {
            console.error("Error generating certificate:", e);
            setError("Error al generar la constancia: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const selectedEvent = deliveryEvents.find(event => event.id === selectedEventId);

    return (
        <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-6">
                Generar Constancia de Entrega de Beneficios
            </h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="bg-indigo-50 p-6 rounded-xl shadow-inner space-y-4 border border-indigo-200">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Selecciona un Evento de Entrega:
                    <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                        disabled={loading}
                    >
                        <option value="">-- Selecciona un Evento --</option>
                        {deliveryEvents.map(event => (
                            <option key={event.id} value={event.id}>
                                {event.eventName} ({event.eventDate})
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    onClick={generateCertificate}
                    className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md flex items-center justify-center"
                    disabled={loading || !selectedEventId}
                >
                    {loading ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    )}
                    Generar Constancia
                </button>
            </div>

            {/* Sección de la Constancia generada */}
            {selectedEvent && (familiesReceived.length > 0 || familiesNotReceived.length > 0) && (
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mt-8 printable-area">
                    <h3 className="text-xl font-bold text-gray-800 text-center mb-4">
                        Constancia de Entrega de Beneficios
                    </h3>
                    <p className="text-center text-gray-600 mb-6">
                        Evento: <span className="font-semibold">{selectedEvent.eventName}</span> - Fecha: <span className="font-semibold">{selectedEvent.eventDate}</span>
                    </p>

                    <div className="mb-6">
                        <h4 className="text-lg font-semibold text-green-700 mb-3">Familias que SÍ Recibieron Beneficio ({familiesReceived.length})</h4>
                        {familiesReceived.length === 0 ? (
                            <p className="text-gray-600">Ninguna familia recibió beneficio en este evento.</p>
                        ) : (
                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                                {familiesReceived.map(family => (
                                    <li key={family.id}>
                                        <span className="font-medium">{family.familyName}</span> (C.I. Jefe: {family.cedulaJefe}) - Dirección: {family.direccion}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold text-red-700 mb-3">Familias que NO Recibieron Beneficio ({familiesNotReceived.length})</h4>
                        {familiesNotReceived.length === 0 ? (
                            <p className="text-gray-600">Todas las familias registradas recibieron beneficio en este evento.</p>
                        ) : (
                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                                {familiesNotReceived.map(family => (
                                    <li key={family.id}>
                                        <span className="font-medium">{family.familyName}</span> (C.I. Jefe: {family.cedulaJefe}) - Dirección: {family.direccion}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="text-center mt-8">
                        <p className="text-sm text-gray-500">Generado el: {new Date().toLocaleDateString()} a las {new Date().toLocaleTimeString()}</p>
                        <button
                            onClick={() => window.print()}
                            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md flex items-center justify-center mx-auto"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4"></path></svg>
                            Imprimir Constancia
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CertificateGenerator;