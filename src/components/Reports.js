import React, { useState, useEffect, useRef, useCallback } from 'react';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';
import jsPDF from 'jspdf';

import html2canvas from 'html2canvas';

const Reports = ({ db, userId }) => {
    const [loadingReports, setLoadingReports] = useState(false);
    const [error, setError] = useState('');
    const reportsRef = useRef();

    const [totalFamilies, setTotalFamilies] = useState(0);
    const [totalCommunityPopulation, setTotalCommunityPopulation] = useState(0);
    const [genderDistribution, setGenderDistribution] = useState({ Masculino: 0, Femenino: 0, Otro: 0, 'N/A': 0 });
    const [ageDistribution, setAgeDistribution] = useState({});
    const [disabilityCount, setDisabilityCount] = useState(0);
    const [chronicIllnessCount, setChronicIllnessCount] = useState(0);
    const [membersWithAnthropometricData, setMembersWithAnthropometricData] = useState(0);

    const [deliveryEvents, setDeliveryEvents] = useState([]);
    const [selectedEventId, setSelectedEventId] = useState('');
    const [familiesReceived, setFamiliesReceived] = useState([]);
    const [familiesNotReceived, setFamiliesNotReceived] = useState([]);
    const [loading, setLoading] = useState(false);

    const [showFilters, setShowFilters] = useState(false);
    const [reportFilters, setReportFilters] = useState({
        totalFamilies: true,
        totalCommunityPopulation: true,
        disabilityCount: true,
        chronicIllnessCount: true,
        ageDistribution: true,
        membersWithAnthropometricData: true,
    });

    const fetchReportData = useCallback(async () => {
        setLoadingReports(true);
        setError('');
        console.log("Fetching report data...");
        try {
            const familiesCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families');
            const familiesSnapshot = await getDocs(familiesCollectionRef);
            const familiesData = familiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setTotalFamilies(familiesData.length);

            let totalPopulation = 0;
            let maleCount = 0;
            let femaleCount = 0;
            let otherGenderCount = 0;
            let naGenderCount = 0;
            let ageGroups = {
                '0-5 años': 0, '6-12 años': 0, '13-17 años': 0, '18-25 años': 0, '26-40 años': 0, '41-60 años': 0, '60+ años': 0
            };
            let disabilityCounter = 0;
            let chronicIllnessCounter = 0;
            let anthropometricDataCounter = 0;

            const allMembersPromises = familiesData.map(async (family) => {
                const membersCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members');
                const membersSnapshot = await getDocs(membersCollectionRef);
                return membersSnapshot.docs.map(doc => doc.data());
            });

            const allMembersArrays = await Promise.all(allMembersPromises);
            const allMembers = allMembersArrays.flat(); // Flatten the array of arrays into a single array of all members

            totalPopulation = allMembers.length;

            allMembers.forEach(member => {
                const memberGender = member.memberGender; // Corrected field name
                if (memberGender === 'Masculino') maleCount++;
                else if (memberGender === 'Femenino') femaleCount++;
                else if (memberGender === 'Otro') otherGenderCount++;
                else naGenderCount++;

                if (member.age !== undefined && member.age !== null && !isNaN(member.age)) { // Check for undefined/null age
                    const age = parseInt(member.age);
                    if (age >= 0 && age <= 5) ageGroups['0-5 años']++;
                    else if (age >= 6 && age <= 12) ageGroups['6-12 años']++;
                    else if (age >= 13 && age <= 17) ageGroups['13-17 años']++;
                    else if (age >= 18 && age <= 25) ageGroups['18-25 años']++;
                    else if (age >= 26 && age <= 40) ageGroups['26-40 años']++;
                    else if (age >= 41 && age <= 60) ageGroups['41-60 años']++;
                    else if (age > 60) ageGroups['60+ años']++;
                }

                if (member.discapacidad) { // Corrected field name
                    disabilityCounter++;
                }

                if (member.enfermedadCronica) { // Corrected field name
                    chronicIllnessCounter++;
                }

                if (member.controlAntropometrico) { // Corrected field name
                    anthropometricDataCounter++;
                }
            });

            setTotalCommunityPopulation(totalPopulation);
            setGenderDistribution({ Masculino: maleCount, Femenino: femaleCount, Otro: otherGenderCount, 'N/A': naGenderCount });
            setAgeDistribution(ageGroups);
            setDisabilityCount(disabilityCounter);
            setChronicIllnessCount(chronicIllnessCounter);
            setMembersWithAnthropometricData(anthropometricDataCounter);

        } catch (e) {
            console.error("Error fetching report data:", e);
            setError("Error al generar los reportes: " + e.message);
        } finally {
            setLoadingReports(false);
        }
    }, [db]);

    const handleDownloadPDF = () => {
        const input = reportsRef.current;
        html2canvas(input)
            .then((canvas) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF();
                const imgWidth = 210;
                const pageHeight = 295;
                const imgHeight = canvas.height * imgWidth / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }
                pdf.save("reportes-clap.pdf");
            });
    };

    useEffect(() => {
        if (db) {
            fetchReportData();
        }
    }, [db, fetchReportData]);

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
            // 1. Fetch the selected delivery event
            const eventDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'deliveries', selectedEventId);
            const eventDocSnap = await getDoc(eventDocRef);

            if (!eventDocSnap.exists()) {
                setError("Evento de entrega no encontrado.");
                setLoading(false);
                return;
            }

            const deliveryEvent = eventDocSnap.data();
            const deliveredMemberIds = new Set(deliveryEvent.deliveredTo || []);

            // 2. Fetch all families
            const familiesSnapshot = await getDocs(collection(db, COLLECTION, DATA_DOCUMENT, 'families'));
            const allFamilies = familiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const familiesThatReceived = [];
            const familiesThatDidNotReceive = [];

            for (const family of allFamilies) {
                // Check if any member of this family received the benefit
                const receivedForThisEvent = family.members && family.members.some(member => deliveredMemberIds.has(member.id));

                if (receivedForThisEvent) {
                    familiesThatReceived.push(family);
                } else {
                    familiesThatDidNotReceive.push(family);
                }
            }

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

    const filterLabels = {
        totalFamilies: 'Total de Familias',
        totalCommunityPopulation: 'Población Total de la Comunidad',
        disabilityCount: 'Personas con Discapacidad',
        chronicIllnessCount: 'Personas con Enfermedades Crónicas',
        ageDistribution: 'Distribución por Edades',
        membersWithAnthropometricData: 'Miembros con Control Antropométrico',
    };

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

    return (
        <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-6">
                Reportes del Sistema CLAP
            </h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="flex justify-center mb-6 gap-4">
                <button
                    onClick={fetchReportData}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md flex items-center"
                    disabled={loadingReports}
                >
                    {loadingReports ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5m0 0h5m-5 0l6-6m-4 10v5m0 0h5m-5 0l6-6m-4 10v5m0 0h5m-5 0l6-6"></path></svg>
                    )}
                    Generar Reportes
                </button>
                <button
                    onClick={handleDownloadPDF}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition duration-300 shadow-md flex items-center"
                >
                    Descargar como PDF
                </button>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300 shadow-md flex items-center"
                >
                    Filtrar
                </button>
            </div>

            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg shadow-inner mb-6">
                    <h4 className="text-lg font-semibold mb-2">Filtrar Reportes</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.keys(reportFilters).map((filter) => (
                            <label key={filter} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    checked={reportFilters[filter]}
                                    onChange={() =>
                                        setReportFilters((prev) => ({
                                            ...prev,
                                            [filter]: !prev[filter],
                                        }))
                                    }
                                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span>{filterLabels[filter]}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {loadingReports ? (
                <div className="text-center text-gray-600 p-6">Generando reportes, por favor espera...</div>
            ) : (
                <div ref={reportsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reportFilters.totalFamilies && (
                        <div className="bg-blue-50 p-6 rounded-xl shadow-md border border-blue-200">
                            <h4 className="text-xl font-semibold text-blue-800 mb-2">Total de Familias</h4>
                            <p className="text-4xl font-bold text-blue-600">{totalFamilies}</p>
                        </div>
                    )}

                    {reportFilters.totalCommunityPopulation && (
                        <div className="bg-green-50 p-6 rounded-xl shadow-md border border-green-200">
                            <h4 className="text-xl font-semibold text-green-800 mb-2">Población Total de la Comunidad</h4>
                            <p className="text-4xl font-bold text-green-600">{totalCommunityPopulation}</p>
                            <h5 className="text-lg font-semibold text-green-700 mt-3">Distribución por Género:</h5>
                            <ul className="list-disc list-inside text-gray-700">
                                <li>Masculino: <span className="font-bold">{genderDistribution.Masculino}</span></li>
                                <li>Femenino: <span className="font-bold">{genderDistribution.Femenino}</span></li>
                                {genderDistribution.Otro > 0 && <li>Otro: <span className="font-bold">{genderDistribution.Otro}</span></li>}
                                {genderDistribution['N/A'] > 0 && <li>No especificado: <span className="font-bold">{genderDistribution['N/A']}</span></li>}
                            </ul>
                        </div>
                    )}

                    {reportFilters.disabilityCount && (
                        <div className="bg-yellow-50 p-6 rounded-xl shadow-md border border-yellow-200">
                            <h4 className="text-xl font-semibold text-yellow-800 mb-2">Personas con Discapacidad</h4>
                            <p className="text-4xl font-bold text-yellow-600">{disabilityCount}</p>
                        </div>
                    )}

                    {reportFilters.chronicIllnessCount && (
                        <div className="bg-red-50 p-6 rounded-xl shadow-md border border-red-200">
                            <h4 className="text-xl font-semibold text-red-800 mb-2">Personas con Enfermedades Crónicas</h4>
                            <p className="text-4xl font-bold text-red-600">{chronicIllnessCount}</p>
                        </div>
                    )}

                    {reportFilters.ageDistribution && (
                        <div className="bg-purple-50 p-6 rounded-xl shadow-md border border-purple-200 col-span-1 md:col-span-2 lg:col-span-1">
                            <h4 className="text-xl font-semibold text-purple-800 mb-2">Distribución por Edades</h4>
                            <ul className="list-disc list-inside text-gray-700">
                                {Object.entries(ageDistribution).map(([range, count]) => (
                                    <li key={range}>{range}: <span className="font-bold">{count}</span></li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {reportFilters.membersWithAnthropometricData && (
                        <div className="bg-orange-50 p-6 rounded-xl shadow-md border border-orange-200 col-span-1 md:col-span-2 lg:col-span-1">
                            <h4 className="text-xl font-semibold text-orange-800 mb-2">Miembros con Control Antropométrico</h4>
                            <p className="text-4xl font-bold text-orange-600">{membersWithAnthropometricData}</p>
                            <p className="text-sm text-gray-600">
                                (Incluye Jefes de Familia y Miembros con datos en el campo "Control Antropométrico")
                            </p>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg">
                <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-6">
                    Generar Reporte de Entrega de Beneficio
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
        </div>
    );
};

export default Reports;