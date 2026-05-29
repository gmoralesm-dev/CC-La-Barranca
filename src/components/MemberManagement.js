import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';

const MemberManagement = ({ db, userId, family, onBack }) => {
    const [members, setMembers] = useState([]);
    const [headOfFamily, setHeadOfFamily] = useState(null);
    const [currentMember, setCurrentMember] = useState(null);
    const [memberName, setMemberName] = useState('');
    const [memberCedula, setMemberCedula] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const [memberGender, setMemberGender] = useState('');
    const [discapacidad, setDiscapacidad] = useState(false);
    const [tipoDiscapacidad, setTipoDiscapacidad] = useState('');
    const [escolaridad, setEscolaridad] = useState('');
    const [enfermedadCronica, setEnfermedadCronica] = useState(false);
    const [tipoEnfermedad, setTipoEnfermedad] = useState('');
    const [medicinas, setMedicinas] = useState('');
    const [controlAntropometrico, setControlAntropometrico] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(true);
    const [error, setError] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // State for adding head of family
    const [jefeDeFamiliaName, setJefeDeFamiliaName] = useState('');
    const [jefeDeFamiliaCedula, setJefeDeFamiliaCedula] = useState('');
    const [jefeFechaNacimiento, setJefeFechaNacimiento] = useState('');
    const [jefeGender, setJefeGender] = useState('');
    const [jefeEscolaridad, setJefeEscolaridad] = useState('');
    const [jefeDiscapacidad, setJefeDiscapacidad] = useState(false);
    const [jefeTipoDiscapacidad, setJefeTipoDiscapacidad] = useState('');
    const [jefeEnfermedadCronica, setJefeEnfermedadCronica] = useState(false);
    const [jefeTipoEnfermedad, setJefeTipoEnfermedad] = useState('');
    const [jefeMedicinas, setJefeMedicinas] = useState('');
    const [jefeControlAntropometrico, setJefeControlAntropometrico] = useState('');
    const [direccion, setDireccion] = useState('');
    const [telefonoContacto, setTelefonoContacto] = useState('');

    // States for benefits management
    const [deliveryEvents, setDeliveryEvents] = useState([]);
    const [selectedDeliveryEvent, setSelectedDeliveryEvent] = useState('');
    const [receivedByMemberId, setReceivedByMemberId] = useState('');
    const [benefitNotes, setBenefitNotes] = useState('');
    const [receipts, setReceipts] = useState([]);
    const [loadingReceipts, setLoadingReceipts] = useState(true);
    const [currentReceipt, setCurrentReceipt] = useState(null);
    const [allPossibleRecipients, setAllPossibleRecipients] = useState([]);

    useEffect(() => {
        if (!db || !family?.id) {
            setMembers([]);
            setLoadingMembers(false);
            return;
        }

        setLoadingMembers(true);
        setError('');

        const membersCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members');
        const q = query(membersCollectionRef, orderBy('isHead', 'desc'), orderBy('memberName', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const membersData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            const head = membersData.find(m => m.isHead);
            setHeadOfFamily(head);
            setMembers(membersData);
            setAllPossibleRecipients(membersData);
            setLoadingMembers(false);
        }, (firestoreError) => {
            setError("Error al cargar los miembros: " + firestoreError.message);
            setLoadingMembers(false);
        });

        return () => unsubscribe();
    }, [db, family?.id]);

    useEffect(() => {
        if (!db) return;

        const fetchDeliveryEvents = async () => {
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
                setError("Error al cargar los eventos de entrega disponibles.");
            }
        };
        fetchDeliveryEvents();
    }, [db]);

    useEffect(() => {
        if (!db || !family?.id) {
            setReceipts([]);
            setLoadingReceipts(false);
            return;
        }

        setLoadingReceipts(true);
        setError('');

        const receiptsCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts');
        const q = query(receiptsCollectionRef, orderBy('receiptDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const receiptsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReceipts(receiptsData);
            setLoadingReceipts(false);
        }, (firestoreError) => {
            setError("Error al cargar los recibos: " + firestoreError.message);
            setLoadingReceipts(false);
        });

        return () => unsubscribe();
    }, [db, family?.id]);

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const calculateBagQuantity = (numBeneficiaries) => {
        if (numBeneficiaries >= 1 && numBeneficiaries <= 5) return 1;
        if (numBeneficiaries >= 6 && numBeneficiaries <= 11) return 2;
        if (numBeneficiaries > 11) return 3;
        return 0;
    };

    const handleAddHeadOfFamily = async (e) => {
        e.preventDefault();
        setError('');

        if (!jefeDeFamiliaName || !jefeDeFamiliaCedula || !jefeFechaNacimiento || !jefeGender || !jefeEscolaridad || !direccion || !telefonoContacto) {
            setError('Todos los campos del jefe de familia son obligatorios.');
            return;
        }

        const headOfFamilyData = {
            memberName: jefeDeFamiliaName,
            memberCedula: jefeDeFamiliaCedula,
            fechaNacimiento: jefeFechaNacimiento,
            age: calculateAge(jefeFechaNacimiento),
            memberGender: jefeGender,
            escolaridad: jefeEscolaridad,
            discapacidad: jefeDiscapacidad,
            tipoDiscapacidad: jefeDiscapacidad ? jefeTipoDiscapacidad : '',
            enfermedadCronica: jefeEnfermedadCronica,
            tipoEnfermedad: jefeEnfermedadCronica ? jefeTipoEnfermedad : '',
            medicinas: jefeEnfermedadCronica ? jefeMedicinas : '',
            controlAntropometrico: jefeControlAntropometrico,
            isHead: true,
            familyId: family.id,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        try {
            const membersCollectionRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members');
            await addDoc(membersCollectionRef, headOfFamilyData);

            const familyDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id);
            await updateDoc(familyDocRef, {
                cedulaJefe: jefeDeFamiliaCedula,
                direccion: direccion,
                telefonoContacto: telefonoContacto
            });

        } catch (e) {
            setError("Error al guardar el jefe de familia: " + e.message);
        }
    };

    const handleSubmitMember = async (e) => {
        e.preventDefault();
        setError('');

        if (!memberName || !fechaNacimiento || !escolaridad || !memberGender) {
            setError('Nombre, Fecha de Nacimiento, Género y Escolaridad del miembro son obligatorios.');
            return;
        }

        const memberData = {
            memberName,
            memberCedula,
            fechaNacimiento,
            age: calculateAge(fechaNacimiento),
            memberGender,
            discapacidad,
            tipoDiscapacidad: discapacidad ? tipoDiscapacidad : '',
            escolaridad,
            enfermedadCronica,
            tipoEnfermedad: enfermedadCronica ? tipoEnfermedad : '',
            medicinas: enfermedadCronica ? medicinas : '',
            controlAntropometrico,
            isHead: false,
            familyId: family.id,
            updatedAt: Date.now()
        };

        try {
            if (currentMember) {
                const memberDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members', currentMember.id);
                await updateDoc(memberDocRef, memberData);
            } else {
                await addDoc(collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members'), {
                    ...memberData,
                    createdAt: Date.now()
                });
            }
            resetMemberForm();
        } catch (e) {
            setError("Error al guardar el miembro: " + e.message);
        }
    };

    const handleEditMember = (member) => {
        setCurrentMember(member);
        setMemberName(member.memberName);
        setMemberCedula(member.memberCedula);
        setFechaNacimiento(member.fechaNacimiento);
        setMemberGender(member.memberGender || '');
        setDiscapacidad(member.discapacidad || false);
        setTipoDiscapacidad(member.tipoDiscapacidad || '');
        setEscolaridad(member.escolaridad || '');
        setEnfermedadCronica(member.enfermedadCronica || false);
        setTipoEnfermedad(member.tipoEnfermedad || '');
        setMedicinas(member.medicinas || '');
        setControlAntropometrico(member.controlAntropometrico || '');
        setError('');
    };

    const handleDeleteClick = (item, type) => {
        setItemToDelete({ ...item, type });
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setError('');
        try {
            if (itemToDelete.type === 'member') {
                const memberDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members', itemToDelete.id);
                await deleteDoc(memberDocRef);

                if (itemToDelete.isHead) {
                    const familyDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id);
                    await updateDoc(familyDocRef, {
                        cedulaJefe: ''
                    });
                }
            } else if (itemToDelete.type === 'receipt') {
                const receiptDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts', itemToDelete.id);
                await deleteDoc(receiptDocRef);
            }

            setShowConfirmModal(false);
            setItemToDelete(null);
        } catch (e) {
            setError("Error al eliminar el item: " + e.message);
        }
    };

    const cancelDelete = () => {
        setShowConfirmModal(false);
        setItemToDelete(null);
    };

    const resetMemberForm = () => {
        setCurrentMember(null);
        setMemberName('');
        setMemberCedula('');
        setFechaNacimiento('');
        setMemberGender('');
        setDiscapacidad(false);
        setTipoDiscapacidad('');
        setEscolaridad('');
        setEnfermedadCronica(false);
        setTipoEnfermedad('');
        setMedicinas('');
        setControlAntropometrico('');
        setError('');
    };

    const handleSubmitBenefit = async (e) => {
        e.preventDefault();
        setError('');

        if (!selectedDeliveryEvent || !receivedByMemberId) {
            setError('Debes seleccionar un Evento de Entrega y quién recibió el beneficio.');
            return;
        }

        const selectedEvent = deliveryEvents.find(event => event.id === selectedDeliveryEvent);
        const selectedRecipient = allPossibleRecipients.find(rec => rec.id === receivedByMemberId);

        if (!selectedEvent || !selectedRecipient) {
            setError('Evento de Entrega o Receptor inválido.');
            return;
        }

        const totalBeneficiaries = members.length;

        const benefitData = {
            deliveryEventId: selectedEvent.id,
            eventName: selectedEvent.eventName,
            eventDate: selectedEvent.eventDate,
            eventType: selectedEvent.eventDescription,
            beneficiariesCount: totalBeneficiaries,
            bagQuantity: calculateBagQuantity(totalBeneficiaries),
            receivedBy: {
                id: selectedRecipient.id,
                name: selectedRecipient.memberName,
                cedula: selectedRecipient.memberCedula || 'N/A'
            },
            jefeDeFamiliaName: headOfFamily?.memberName || family.familyName,
            notes: benefitNotes,
            receiptDate: Date.now()
        };

        try {
            if (currentReceipt) {
                const receiptDocRef = doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts', currentReceipt.id);
                await updateDoc(receiptDocRef, benefitData);
            } else {
                await addDoc(collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts'), benefitData);
            }
            resetBenefitForm();
        } catch (e) {
            setError("Error al guardar el recibo: " + e.message);
        }
    };

    const handleEditReceipt = (receipt) => {
        setCurrentReceipt(receipt);
        setSelectedDeliveryEvent(receipt.deliveryEventId);
        setReceivedByMemberId(receipt.receivedBy.id);
        setBenefitNotes(receipt.notes || '');
        setError('');
    };

    const resetBenefitForm = () => {
        setCurrentReceipt(null);
        setSelectedDeliveryEvent('');
        setReceivedByMemberId('');
        setBenefitNotes('');
        setError('');
    };

    if (loadingMembers) {
        return <div className="text-center text-gray-600 p-4">Cargando miembros...</div>;
    }

    if (!headOfFamily) {
        return (
            <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg">
                <button
                    onClick={onBack}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition duration-300 shadow-sm mb-6"
                >
                    &larr; Volver a Familias
                </button>
                <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-4">
                    Añadir Jefe de Familia para: {family.familyName}
                </h2>
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                <form onSubmit={handleAddHeadOfFamily} className="bg-indigo-50 p-6 rounded-xl shadow-inner space-y-4 border border-indigo-200">
                    <input
                        type="text"
                        placeholder="Nombre del Jefe de Familia"
                        value={jefeDeFamiliaName}
                        onChange={(e) => setJefeDeFamiliaName(e.target.value.toUpperCase())}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Cédula del Jefe de Familia"
                        value={jefeDeFamiliaCedula}
                        onChange={(e) => setJefeDeFamiliaCedula(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                    />
                     <input
                    type="text"
                    placeholder="Dirección Completa (Calle, Sector, Casa/Edificio)"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                     />
                <input
                    type="tel"
                    placeholder="Teléfono de Contacto"
                    value={telefonoContacto}
                    onChange={(e) => setTelefonoContacto(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Fecha de Nacimiento del Jefe:
                        <input
                            type="date"
                            value={jefeFechaNacimiento}
                            onChange={(e) => setJefeFechaNacimiento(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                            required
                        />
                    </label>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Género del Jefe:
                        <select
                            value={jefeGender}
                            onChange={(e) => setJefeGender(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                            required
                        >
                            <option value="">Selecciona Género</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </label>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Nivel de Escolaridad del Jefe:
                        <select
                            value={jefeEscolaridad}
                            onChange={(e) => setJefeEscolaridad(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                            required
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="Ninguna">Ninguna</option>
                            <option value="Preescolar">Preescolar</option>
                            <option value="Primaria">Primaria</option>
                            <option value="Secundaria">Secundaria</option>
                            <option value="Diversificado">Diversificado</option>
                            <option value="Universitaria">Universitaria</option>
                            <option value="Técnica">Técnica</option>
                        </select>
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="jefeDiscapacidad"
                            checked={jefeDiscapacidad}
                            onChange={(e) => setJefeDiscapacidad(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="jefeDiscapacidad" className="text-gray-700">¿El Jefe tiene Discapacidad?</label>
                    </div>
                    {jefeDiscapacidad && (
                        <input
                            type="text"
                            placeholder="Tipo de Discapacidad del Jefe"
                            value={jefeTipoDiscapacidad}
                            onChange={(e) => setJefeTipoDiscapacidad(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required={jefeDiscapacidad}
                        />
                    )}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="jefeEnfermedadCronica"
                            checked={jefeEnfermedadCronica}
                            onChange={(e) => setJefeEnfermedadCronica(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="jefeEnfermedadCronica" className="text-gray-700">¿El Jefe tiene Enfermedad Crónica?</label>
                    </div>
                    {jefeEnfermedadCronica && (
                        <>
                            <input
                                type="text"
                                placeholder="Tipo de Enfermedad Crónica del Jefe"
                                value={jefeTipoEnfermedad}
                                onChange={(e) => setJefeTipoEnfermedad(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required={jefeEnfermedadCronica}
                            />
                            <textarea
                                placeholder="Medicinas que toma el Jefe (separadas por coma)"
                                value={jefeMedicinas}
                                onChange={(e) => setJefeMedicinas(e.target.value)}
                                rows="2"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                            ></textarea>
                        </>
                    )}
                    <textarea
                        placeholder="Control Antropométrico del Jefe (Tallas, Medidas - opcional)"
                        value={jefeControlAntropometrico}
                        onChange={(e) => setJefeControlAntropometrico(e.target.value)}
                        rows="2"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                    ></textarea>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md"
                        >
                            Guardar Jefe de Familia
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg">
            <button
                onClick={onBack}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition duration-300 shadow-sm mb-6"
            >
                &larr; Volver a Familias
            </button>

            <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-4">
                Miembros de la Familia de: {family.familyName}
            </h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            <div className="bg-indigo-50 p-6 rounded-xl shadow-inner space-y-4 border border-indigo-200">
                <h3 className="text-xl font-semibold text-indigo-600">
                    {currentMember ? 'Editar Miembro' : 'Añadir Nuevo Miembro'}
                </h3>
                <input
                    type="text"
                    placeholder="Nombre Completo del Miembro"
                    value={memberName}
                    onChange={(e) => setMemberName(e.target.value.toUpperCase())}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <input
                    type="text"
                    placeholder="Cédula del Miembro"
                    value={memberCedula}
                    onChange={(e) => setMemberCedula(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Fecha de Nacimiento:
                    <input
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                        required
                    />
                </label>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Género:
                    <select
                        value={memberGender}
                        onChange={(e) => setMemberGender(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                        required
                    >
                        <option value="">Selecciona Género</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Femenino">Femenino</option>
                        <option value="Otro">Otro</option>
                    </select>
                </label>
                <label className="block text-gray-700 text-sm font-bold mb-2">
                    Nivel de Escolaridad:
                    <select
                        value={escolaridad}
                        onChange={(e) => setEscolaridad(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-1"
                        required
                    >
                        <option value="">Selecciona una opción</option>
                        <option value="Ninguna">Ninguna</option>
                        <option value="Preescolar">Preescolar</option>
                        <option value="Primaria">Primaria</option>
                        <option value="Secundaria">Secundaria</option>
                        <option value="Diversificado">Diversificado</option>
                        <option value="Universitaria">Universitaria</option>
                        <option value="Técnica">Técnica</option>
                    </select>
                </label>

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="discapacidad"
                        checked={discapacidad}
                        onChange={(e) => setDiscapacidad(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="discapacidad" className="text-gray-700">¿Tiene Discapacidad?</label>
                </div>
                {discapacidad && (
                    <input
                        type="text"
                        placeholder="Tipo de Discapacidad"
                        value={tipoDiscapacidad}
                        onChange={(e) => setTipoDiscapacidad(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required={discapacidad}
                    />
                )}

                <div className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        id="enfermedadCronica"
                        checked={enfermedadCronica}
                        onChange={(e) => setEnfermedadCronica(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="enfermedadCronica" className="text-gray-700">¿Tiene Enfermedad Crónica?</label>
                </div>
                {enfermedadCronica && (
                    <>
                        <input
                            type="text"
                            placeholder="Tipo de Enfermedad Crónica"
                            value={tipoEnfermedad}
                            onChange={(e) => setTipoEnfermedad(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required={enfermedadCronica}
                        />
                        <textarea
                            placeholder="Medicinas que toma (separadas por coma)"
                            value={medicinas}
                            onChange={(e) => setMedicinas(e.target.value)}
                            rows="2"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                        ></textarea>
                    </>
                )}

                <textarea
                    placeholder="Control Antropométrico (Tallas, Medidas - opcional)"
                    value={controlAntropometrico}
                    onChange={(e) => setControlAntropometrico(e.target.value)}
                    rows="2"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                ></textarea>

                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                    {currentMember && (
                        <button
                            type="button"
                            onClick={resetMemberForm}
                            className="w-full sm:w-auto bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition duration-300 shadow-md"
                        >
                            Cancelar Edición
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSubmitMember}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md"
                    >
                        {currentMember ? 'Actualizar Miembro' : 'Añadir Miembro'}
                    </button>
                </div>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-indigo-700 mt-8 text-center">
                Miembros Registrados ({members.length} en total)
            </h3>
            {loadingMembers ? (
                <div className="text-center text-gray-600 p-4">Cargando miembros...</div>
            ) : members.length === 0 ? (
                <div className="text-center text-gray-500 p-6 border border-dashed border-gray-300 rounded-lg bg-white">
                    No hay miembros registrados para esta familia. ¡Usa el formulario de arriba para añadir uno!
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map((member) => (
                        <div key={member.id} className={`bg-white rounded-xl shadow-md p-5 space-y-2 border ${member.isHead ? 'border-indigo-500' : 'border-gray-200'}`}>
                            <h4 className="text-lg font-semibold text-gray-900">{member.memberName} {member.isHead && <span className="text-indigo-600 font-bold">(Jefe de Familia)</span>}</h4>
                            <p className="text-gray-700 text-sm">Cédula: {member.memberCedula || 'N/A'}</p>
                            <p className="text-gray-700 text-sm">
                                F. Nacimiento: {member.fechaNacimiento} (Edad: {member.age || 'N/A'})
                            </p>
                            <p className="text-gray-700 text-sm">Género: {member.memberGender || 'N/A'}</p>
                            <p className="text-gray-700 text-sm">Escolaridad: {member.escolaridad}</p>
                            {member.discapacidad && (
                                <p className="text-red-600 text-sm font-medium">Discapacidad: {member.tipoDiscapacidad}</p>
                            )}
                            {member.enfermedadCronica && (
                                <p className="text-orange-600 text-sm font-medium">Enfermedad Crónica: {member.tipoEnfermedad}</p>
                            )}
                            {member.medicinas && member.enfermedadCronica && (
                                <p className="text-gray-600 text-sm italic">Medicinas: {member.medicinas}</p>
                            )}
                            {member.controlAntropometrico && (
                                <p className="text-gray-600 text-sm italic">Antropometría: {member.controlAntropometrico}</p>
                            )}
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => handleEditMember(member)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 shadow-sm"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDeleteClick(member, 'member')}
                                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300 shadow-sm"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t border-indigo-200 pt-8 mt-8 space-y-8">
                <h3 className="text-xl sm:text-2xl font-bold text-indigo-700 text-center">
                    Gestión de Beneficios
                </h3>

                <form onSubmit={handleSubmitBenefit} className="bg-green-50 p-6 rounded-xl shadow-inner space-y-4 border border-green-200">
                    <h4 className="text-lg font-semibold text-green-600">Registrar Entrega de Beneficio</h4>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Evento de Entrega:
                        <select
                            value={selectedDeliveryEvent}
                            onChange={(e) => setSelectedDeliveryEvent(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mt-1"
                            required
                        >
                            <option value="">Selecciona un Evento</option>
                            {deliveryEvents.map(event => (
                                <option key={event.id} value={event.id}>
                                    {event.eventName} ({event.eventDate})
                                </option>
                            ))}
                        </select>
                    </label>
                    <p className="text-gray-700 text-sm font-bold">
                        Cantidad de Bolsas (calculada): <span className="font-normal text-lg">{calculateBagQuantity(members.length)}</span>
                    </p>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Recibido por:
                        <select
                            value={receivedByMemberId}
                            onChange={(e) => setReceivedByMemberId(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mt-1"
                            required
                        >
                            <option value="">Selecciona un Miembro</option>
                            {allPossibleRecipients.map(recipient => (
                                <option key={recipient.id} value={recipient.id}>
                                    {recipient.memberName} ({recipient.memberCedula || 'N/A'})
                                </option>
                            ))}
                        </select>
                    </label>
                    <textarea
                        placeholder="Notas adicionales sobre la entrega (opcional)"
                        value={benefitNotes}
                        onChange={(e) => setBenefitNotes(e.target.value)}
                        rows="2"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
                    ></textarea>
                    <div className="flex flex-col sm:flex-row gap-3 justify-end">
                        {currentReceipt && (
                            <button
                                type="button"
                                onClick={resetBenefitForm}
                                className="w-full sm:w-auto bg-gray-300 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-400 transition duration-300 shadow-md"
                            >
                                Cancelar Edición
                            </button>
                        )}
                        <button
                            type="submit"
                            className="w-full sm:w-auto bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition duration-300 shadow-md"
                        >
                            {currentReceipt ? 'Actualizar Recibo' : 'Registrar Recibo'}
                        </button>
                    </div>
                </form>

                <h4 className="text-lg sm:text-xl font-bold text-indigo-700 mt-8 text-center">
                    Historial de Entregas de Beneficios
                </h4>
                {loadingReceipts ? (
                    <div className="text-center text-gray-600 p-4">Cargando historial de entregas...</div>
                ) : receipts.length === 0 ? (
                    <div className="text-center text-gray-500 p-6 border border-dashed border-gray-300 rounded-lg bg-white">
                        No hay entregas de beneficios registradas para esta familia.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {receipts.map((receipt) => (
                            <div key={receipt.id} className="bg-white rounded-xl shadow-md p-5 space-y-2 border border-green-200">
                                <p className="text-lg font-semibold text-gray-900">
                                    Evento: {receipt.eventName} ({receipt.eventDate})
                                </p>
                                <p className="text-gray-700 text-sm">Tipo: {receipt.eventType}</p>
                                <p className="text-gray-700 text-sm">Bolsas Asignadas: {receipt.bagQuantity}</p>
                                <p className="text-gray-700 text-sm">Recibido por: {receipt.receivedBy.name} (C.I: {receipt.receivedBy.cedula})</p>
                                <p className="text-gray-700 text-sm font-medium">Jefe de Familia: {receipt.jefeDeFamiliaName}</p>
                                {receipt.notes && <p className="text-gray-600 text-sm italic">Notas: {receipt.notes}</p>}
                                <p className="text-gray-500 text-xs">Registrado el: {new Date(receipt.receiptDate).toLocaleDateString()}</p>
                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => handleEditReceipt(receipt)}
                                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300 shadow-sm"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(receipt, 'receipt')}
                                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300 shadow-sm"
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showConfirmModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
                        <h3 className="text-xl font-semibold text-gray-800">Confirmar Eliminación</h3>
                        <p className="text-gray-600">
                            ¿Estás seguro de que quieres eliminar este item? Esta acción no se puede deshacer.
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

export default MemberManagement;