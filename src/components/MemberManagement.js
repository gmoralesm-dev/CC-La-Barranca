// src/components/MemberManagement.js
import React, { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy, getDocs } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';

// 🔍 MOTOR DE VALIDACIÓN CENTRALIZADO
const VALIDATORS = {
  name: (val) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'\-]+$/.test(val?.trim()),
  cedula: (val) => {
    if (!val?.trim()) return { isValid: true, formatted: '' };
    let clean = val.trim().toUpperCase();
    if (/^[VE]\d{5,9}$/.test(clean)) clean = clean[0] + '-' + clean.substring(1);
    return { isValid: /^[VE]-\d{5,9}$/.test(clean), formatted: clean };
  },
  date: (val) => {
    if (!val) return { isValid: false, error: 'Fecha requerida' };
    const d = new Date(val);
    if (isNaN(d)) return { isValid: false, error: 'Fecha inválida' };
    if (d > new Date()) return { isValid: false, error: 'No puede ser futura' };
    return { isValid: true };
  },
  phone: (val) => {
    if (!val?.trim()) return { isValid: true, formatted: '' };
    const clean = val.replace(/[^\d+]/g, '');
    return { isValid: /^(\+58)?0[4|2]\d{9}$/.test(clean), formatted: clean };
  },
  required: (val, label) => {
    if (!val || (typeof val === 'string' && !val.trim())) {
      return { isValid: false, error: `${label} es requerido` };
    }
    return { isValid: true };
  }
};

// 🧩 COMPONENTES UI REUTILIZABLES
const FormInput = ({ label, error, value, onChange, onBlur, type = 'text', placeholder, required, transform }) => (
  <div className="space-y-1">
    {label && <label className="block text-gray-700 text-sm font-bold">{label}{required && ' *'}</label>}
    <input
      type={type}
      value={value || ''}
      onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition ${error ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
      required={required}
    />
    {error && <p className="text-red-500 text-xs flex items-center gap-1">⚠️ {error}</p>}
  </div>
);

const FormSelect = ({ label, error, value, onChange, options, required }) => (
  <div className="space-y-1">
    {label && <label className="block text-gray-700 text-sm font-bold">{label}{required && ' *'}</label>}
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 transition ${error ? 'border-red-300 bg-red-50 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'}`}
      required={required}
    >
      <option value="">Seleccionar</option>
      {options.map(opt => <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>)}
    </select>
    {error && <p className="text-red-500 text-xs">⚠️ {error}</p>}
  </div>
);

const MemberCard = ({ member, onEdit, onDelete }) => (
  <div className={`bg-white rounded-xl shadow-md p-5 space-y-2 border ${member.isHead ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}>
    <h4 className="text-lg font-semibold text-gray-900">{member.memberName} {member.isHead && <span className="text-indigo-600 font-bold">(Jefe)</span>}</h4>
    <p className="text-gray-700 text-sm">Cédula: {member.memberCedula || 'N/A'}</p>
    <p className="text-gray-700 text-sm">Edad: {member.age || 'N/A'} | Género: {member.memberGender}</p>
    <p className="text-gray-700 text-sm">Escolaridad: {member.escolaridad}</p>
    {member.discapacidad && <p className="text-red-600 text-sm font-medium"> Discapacidad: {member.tipoDiscapacidad}</p>}
    {member.enfermedadCronica && <p className="text-orange-600 text-sm font-medium">🏥 Enf. Crónica: {member.tipoEnfermedad}</p>}
    {member.medicinas && member.enfermedadCronica && <p className="text-gray-600 text-xs italic">💊 Medicinas: {member.medicinas}</p>}
    <div className="flex justify-end gap-2 mt-3">
      <button onClick={() => onEdit(member)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">Editar</button>
      <button onClick={() => onDelete(member)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Eliminar</button>
    </div>
  </div>
);

const ReceiptCard = ({ receipt, onEdit, onDelete }) => (
  <div className="bg-white rounded-xl shadow-md p-5 space-y-2 border border-green-200">
    <p className="text-lg font-semibold text-gray-900">📦 {receipt.eventName} ({receipt.eventDate})</p>
    <p className="text-gray-700 text-sm">Tipo: {receipt.eventType} | Bolsas: {receipt.bagQuantity}</p>
    <p className="text-gray-700 text-sm">Recibido por: {receipt.receivedBy.name} (CI: {receipt.receivedBy.cedula})</p>
    {receipt.notes && <p className="text-gray-600 text-xs italic">📝 {receipt.notes}</p>}
    <div className="flex justify-end gap-2 mt-3">
      <button onClick={() => onEdit(receipt)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">Editar</button>
      <button onClick={() => onDelete(receipt)} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Eliminar</button>
    </div>
  </div>
);

// 🏠 COMPONENTE PRINCIPAL
const MemberManagement = ({ db, userId, family, onBack }) => {
  // --- ESTADOS ---
  const [members, setMembers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Estado unificado para formulario de miembro/jefe
  const [formMode, setFormMode] = useState('add'); // 'add' | 'edit'
  const [isHeadForm, setIsHeadForm] = useState(false);
  const [formData, setFormData] = useState({
    memberName: '', memberCedula: '', fechaNacimiento: '', memberGender: '', escolaridad: '',
    discapacidad: false, tipoDiscapacidad: '', enfermedadCronica: false, tipoEnfermedad: '',
    medicinas: '', controlAntropometrico: '', direccion: '', telefonoContacto: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Estado para beneficios
  const [benefitForm, setBenefitForm] = useState({ selectedEvent: '', receivedBy: '', notes: '' });
  const [benefitErrors, setBenefitErrors] = useState({});

  // --- EFECTOS (CARGA DE DATOS) ---
  useEffect(() => {
    if (!db || !family?.id) return;
    setLoading(true);

    const unsubMembers = onSnapshot(
      query(collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members'), orderBy('isHead', 'desc'), orderBy('memberName', 'asc')),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMembers(data);
        setLoading(false);
      },
      (err) => setError('Error cargando miembros: ' + err.message)
    );

    const unsubReceipts = onSnapshot(
      query(collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts'), orderBy('receiptDate', 'desc')),
      (snap) => setReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => setError('Error cargando recibos: ' + err.message)
    );

    getDocs(query(collection(db, COLLECTION, DATA_DOCUMENT, 'deliveries'), orderBy('eventDate', 'desc')))
      .then(snap => setDeliveryEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(() => setError('No se pudieron cargar los eventos de entrega.'));

    return () => { unsubMembers(); unsubReceipts(); };
  }, [db, family?.id]);

  // --- UTILIDADES ---
  const calculateAge = (dob) => {
    if (!dob) return 'N/A';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const calculateBags = (count) => {
    if (count <= 5) return 1;
    if (count <= 11) return 2;
    return 3;
  };

  // --- VALIDACIÓN DEL FORMULARIO ---
  const validateField = useCallback((field, value) => {
    let err = '';
    if (['memberName', 'direccion'].includes(field) && !VALIDATORS.name(value)) err = 'Solo letras y espacios permitidos';
    if (field === 'memberCedula' && value && !VALIDATORS.cedula(value).isValid) err = 'Formato: V-XXXXXXXX o E-XXXXXXXX';
    if (field === 'fechaNacimiento') {
      const res = VALIDATORS.date(value);
      if (!res.isValid) err = res.error;
    }
    if (field === 'telefonoContacto' && value && !VALIDATORS.phone(value).isValid) err = 'Teléfono inválido (ej: 0412-1234567)';
    if (['memberName', 'fechaNacimiento', 'memberGender', 'escolaridad'].includes(field) && !value?.trim()) err = 'Campo requerido';
    if (isHeadForm && ['direccion', 'telefonoContacto'].includes(field) && !value?.trim()) err = 'Campo requerido';
    return err;
  }, [isHeadForm]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) setFormErrors(prev => ({ ...prev, [field]: validateField(field, value) }));
  };

  const handleFormBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setFormErrors(prev => ({ ...prev, [field]: validateField(field, formData[field]) }));
  };

  const validateAll = () => {
    const requiredFields = ['memberName', 'fechaNacimiento', 'memberGender', 'escolaridad'];
    if (isHeadForm) requiredFields.push('direccion', 'telefonoContacto');
    
    const newErrors = {};
    let isValid = true;
    requiredFields.forEach(f => {
      const err = validateField(f, formData[f]);
      if (err) { newErrors[f] = err; isValid = false; }
    });
    if (formData.memberCedula && !VALIDATORS.cedula(formData.memberCedula).isValid) {
      newErrors.memberCedula = 'Cédula inválida'; isValid = false;
    }
    setFormErrors(newErrors);
    return isValid;
  };

  // --- HANDLERS ---
  const openHeadForm = () => {
    setIsHeadForm(true); setFormMode('add'); setFormData({ ...formData, memberName: '', memberCedula: '', fechaNacimiento: '', memberGender: '', escolaridad: '', direccion: '', telefonoContacto: '' });
    setFormErrors({}); setTouched({});
  };

  const openMemberForm = (member = null) => {
    setIsHeadForm(false);
    if (member) {
      setFormMode('edit');
      setFormData({ ...member, discapacidad: !!member.discapacidad, enfermedadCronica: !!member.enfermedadCronica });
    } else {
      setFormMode('add');
      setFormData({ memberName: '', memberCedula: '', fechaNacimiento: '', memberGender: '', escolaridad: '', discapacidad: false, tipoDiscapacidad: '', enfermedadCronica: false, tipoEnfermedad: '', medicinas: '', controlAntropometrico: '' });
    }
    setFormErrors({}); setTouched({});
  };

  const handleSubmitMember = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll()) return;

    const { formatted } = VALIDATORS.cedula(formData.memberCedula);
    const data = {
      memberName: formData.memberName.trim(),
      memberCedula: formatted,
      fechaNacimiento: formData.fechaNacimiento,
      age: calculateAge(formData.fechaNacimiento),
      memberGender: formData.memberGender,
      escolaridad: formData.escolaridad,
      discapacidad: formData.discapacidad,
      tipoDiscapacidad: formData.discapacidad ? formData.tipoDiscapacidad : '',
      enfermedadCronica: formData.enfermedadCronica,
      tipoEnfermedad: formData.enfermedadCronica ? formData.tipoEnfermedad : '',
      medicinas: formData.enfermedadCronica ? formData.medicinas : '',
      controlAntropometrico: formData.controlAntropometrico,
      isHead: isHeadForm,
      familyId: family.id,
      updatedAt: Date.now()
    };

    try {
      setLoading(true);
      if (formMode === 'edit') {
        await updateDoc(doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members', formData.id), data);
      } else {
        await addDoc(collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members'), { ...data, createdAt: Date.now() });
        if (isHeadForm) {
          await updateDoc(doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id), {
            cedulaJefe: formatted, direccion: formData.direccion, telefonoContacto: formData.telefonoContacto
          });
        }
      }
      openMemberForm(); // Reset
    } catch (err) {
      setError('Error guardando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'member') {
        await deleteDoc(doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members', itemToDelete.id));
        if (itemToDelete.isHead) await updateDoc(doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id), { cedulaJefe: '' });
      } else {
        await deleteDoc(doc(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts', itemToDelete.id));
      }
    } catch (err) { setError('Error eliminando: ' + err.message); }
    setShowConfirm(false); setItemToDelete(null);
  };

  const handleSubmitBenefit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = {};
    if (!benefitForm.selectedEvent) errs.selectedEvent = 'Requerido';
    if (!benefitForm.receivedBy) errs.receivedBy = 'Requerido';
    setBenefitErrors(errs);
    if (Object.keys(errs).length) return;

    const event = deliveryEvents.find(ev => ev.id === benefitForm.selectedEvent);
    const recipient = members.find(m => m.id === benefitForm.receivedBy);
    if (!event || !recipient) return setError('Datos inválidos.');

    const data = {
      deliveryEventId: event.id, eventName: event.eventName, eventDate: event.eventDate,
      eventType: event.eventDescription, beneficiariesCount: members.length,
      bagQuantity: calculateBags(members.length),
      receivedBy: { id: recipient.id, name: recipient.memberName, cedula: recipient.memberCedula || 'N/A' },
      jefeDeFamiliaName: members.find(m => m.isHead)?.memberName || family.familyName,
      notes: benefitForm.notes, receiptDate: Date.now()
    };

    try {
      setLoading(true);
      await addDoc(collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'receipts'), data);
      setBenefitForm({ selectedEvent: '', receivedBy: '', notes: '' });
    } catch (err) { setError('Error registrando beneficio: ' + err.message); }
    finally { setLoading(false); }
  };

  // --- RENDER ---
  const headExists = members.some(m => m.isHead);
  if (loading && members.length === 0) return <div className="text-center p-8">Cargando datos de la familia...</div>;

  return (
    <div className="space-y-8 p-4 bg-white rounded-xl shadow-lg max-w-5xl mx-auto">
      <button onClick={onBack} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition mb-4">← Volver</button>
      <h2 className="text-2xl font-bold text-indigo-700 text-center">Miembros: {family.familyName}</h2>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">{error}</div>}

      {/* 📝 FORMULARIO UNIFICADO (JEFE O MIEMBRO) */}
      <form onSubmit={handleSubmitMember} className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 space-y-4">
        <h3 className="text-xl font-semibold text-indigo-700">{isHeadForm ? '👑 Registrar Jefe de Familia' : formMode === 'edit' ? '✏️ Editar Miembro' : '➕ Nuevo Miembro'}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Nombre Completo" value={formData.memberName} onChange={v => handleFormChange('memberName', v.toUpperCase())} onBlur={() => handleFormBlur('memberName')} error={formErrors.memberName} required placeholder="EJ: MARÍA PÉREZ" />
          <FormInput label="Cédula" value={formData.memberCedula} onChange={v => handleFormChange('memberCedula', v)} onBlur={() => handleFormBlur('memberCedula')} error={formErrors.memberCedula} placeholder="V-12345678" />
        </div>

        {isHeadForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput label="Dirección" value={formData.direccion} onChange={v => handleFormChange('direccion', v)} onBlur={() => handleFormBlur('direccion')} error={formErrors.direccion} required placeholder="Calle, Sector, Casa" />
            <FormInput label="Teléfono" value={formData.telefonoContacto} onChange={v => handleFormChange('telefonoContacto', v)} onBlur={() => handleFormBlur('telefonoContacto')} error={formErrors.telefonoContacto} required placeholder="0412-1234567" />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput label="Fecha Nacimiento" type="date" value={formData.fechaNacimiento} onChange={v => handleFormChange('fechaNacimiento', v)} onBlur={() => handleFormBlur('fechaNacimiento')} error={formErrors.fechaNacimiento} required />
          <FormSelect label="Género" value={formData.memberGender} onChange={v => handleFormChange('memberGender', v)} options={['Masculino', 'Femenino', 'Otro']} required />
          <FormSelect label="Escolaridad" value={formData.escolaridad} onChange={v => handleFormChange('escolaridad', v)} options={['Ninguna', 'Preescolar', 'Primaria', 'Secundaria', 'Diversificado', 'Universitaria', 'Técnica']} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.discapacidad} onChange={e => handleFormChange('discapacidad', e.target.checked)} className="h-4 w-4 text-indigo-600 rounded" />
            <span>¿Tiene discapacidad?</span>
          </label>
          {formData.discapacidad && <FormInput label="Tipo de discapacidad" value={formData.tipoDiscapacidad} onChange={v => handleFormChange('tipoDiscapacidad', v)} />}
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.enfermedadCronica} onChange={e => handleFormChange('enfermedadCronica', e.target.checked)} className="h-4 w-4 text-indigo-600 rounded" />
            <span>¿Enfermedad crónica?</span>
          </label>
          {formData.enfermedadCronica && (
            <>
              <FormInput label="Tipo de enfermedad" value={formData.tipoEnfermedad} onChange={v => handleFormChange('tipoEnfermedad', v)} />
              <FormInput label="Medicinas" value={formData.medicinas} onChange={v => handleFormChange('medicinas', v)} />
            </>
          )}
        </div>

        <FormInput label="Control Antropométrico" value={formData.controlAntropometrico} onChange={v => handleFormChange('controlAntropometrico', v)} />

        <div className="flex justify-end gap-3 pt-2">
          {(formMode === 'edit' || isHeadForm) && <button type="button" onClick={() => { setIsHeadForm(false); setFormMode('add'); setFormErrors({}); }} className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancelar</button>}
          <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Guardando...' : isHeadForm ? 'Guardar Jefe' : formMode === 'edit' ? 'Actualizar' : 'Añadir Miembro'}
          </button>
        </div>
      </form>

      {/* 👥 LISTA DE MIEMBROS */}
      {!headExists ? (
        <div className="text-center p-6 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50">
          <p className="text-indigo-700 font-medium">️ Esta familia aún no tiene Jefe registrado.</p>
          <button onClick={openHeadForm} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"> Registrar Jefe de Familia</button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">Miembros Registrados ({members.length})</h3>
            <button onClick={() => openMemberForm()} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">+ Añadir Miembro</button>
          </div>
          {members.length === 0 ? <p className="text-gray-500 text-center py-4">No hay miembros aún.</p> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {members.map(m => <MemberCard key={m.id} member={m} onEdit={openMemberForm} onDelete={(item) => { setItemToDelete({ ...item, type: 'member' }); setShowConfirm(true); }} />)}
            </div>
          )}
        </>
      )}

      {/* 📦 BENEFICIOS */}
      {headExists && (
        <div className="border-t pt-8 space-y-6">
          <h3 className="text-xl font-bold text-green-700 text-center">📦 Gestión de Beneficios</h3>
          <form onSubmit={handleSubmitBenefit} className="bg-green-50 p-6 rounded-xl border border-green-200 space-y-4">
            <FormSelect label="Evento de Entrega" value={benefitForm.selectedEvent} onChange={v => setBenefitForm(p => ({ ...p, selectedEvent: v }))} options={deliveryEvents.map(e => ({ value: e.id, label: `${e.eventName} (${e.eventDate})` }))} error={benefitErrors.selectedEvent} required />
            <p className="text-sm text-gray-600">📦 Bolsas asignadas automáticamente: <strong>{calculateBags(members.length)}</strong></p>
            <FormSelect label="Recibido por" value={benefitForm.receivedBy} onChange={v => setBenefitForm(p => ({ ...p, receivedBy: v }))} options={members.map(m => ({ value: m.id, label: m.memberName }))} error={benefitErrors.receivedBy} required />
            <FormInput label="Notas (opcional)" value={benefitForm.notes} onChange={v => setBenefitForm(p => ({ ...p, notes: v }))} />
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Registrar Entrega</button>
            </div>
          </form>

          <h4 className="text-lg font-bold text-gray-800">Historial de Entregas</h4>
          {receipts.length === 0 ? <p className="text-gray-500 text-center py-4">Sin entregas registradas.</p> : (
            <div className="space-y-4">{receipts.map(r => <ReceiptCard key={r.id} receipt={r} onEdit={() => {}} onDelete={(item) => { setItemToDelete({ ...item, type: 'receipt' }); setShowConfirm(true); }} />)}</div>
          )}
        </div>
      )}

      {/* 🗑️ MODAL DE CONFIRMACIÓN */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800">¿Eliminar este registro?</h3>
            <p className="text-gray-600">Esta acción no se puede deshacer.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setShowConfirm(false)} className="px-5 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">Cancelar</button>
              <button onClick={handleDelete} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;
