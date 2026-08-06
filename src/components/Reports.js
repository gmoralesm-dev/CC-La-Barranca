// src/components/Reports.js
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useReportData } from '../hooks/useReportData';
import { generatePDF } from '../utils/pdfGenerator';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';
import logo from '../assets/logo-cc-la-barranca.png';

const Reports = ({ db, userId }) => {
  // --- REPORTES GENERALES ---
  const { reportData, loading: reportsLoading, error: reportsError, refetch } = useReportData(db);
  const reportsRef = useRef(null);
  const generalPdfRef = useRef(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    totalFamilies: true,
    totalCommunityPopulation: true,
    disabilityCount: true,
    chronicIllnessCount: true,
    ageDistribution: true,
    anthropometricCount: true,
  });

  // --- CONSTANCIAS DE ENTREGA ---
  const [deliveryEvents, setDeliveryEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [certificateData, setCertificateData] = useState({ received: [], notReceived: [] });
  const [certLoading, setCertLoading] = useState(false);

  // --- REPORTE INDIVIDUAL POR FAMILIA ---
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [familyReportData, setFamilyReportData] = useState({ members: [], receipts: [] });
  const [loadingFamily, setLoadingFamily] = useState(false);
  const familyReportRef = useRef(null);

  // Cargar eventos de entrega
  const fetchDeliveryEvents = useCallback(async () => {
    if (!db) return;
    setCertLoading(true);
    try {
      const eventsRef = collection(db, COLLECTION, DATA_DOCUMENT, 'deliveries');
      const q = query(eventsRef, orderBy('eventDate', 'desc'));
      const snap = await getDocs(q);
      setDeliveryEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error cargando eventos:', err);
    } finally {
      setCertLoading(false);
    }
  }, [db]);

  // Cargar datos específicos de la familia seleccionada
  useEffect(() => {
    const fetchFamilyDetails = async () => {
      if (!selectedFamilyId || !db) {
        setFamilyReportData({ members: [], receipts: [] });
        return;
      }
      setLoadingFamily(true);
      try {
        const membersRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', selectedFamilyId, 'members');
        const membersSnap = await getDocs(query(membersRef, orderBy('isHead', 'desc')));
        const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const receiptsRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', selectedFamilyId, 'receipts');
        const receiptsSnap = await getDocs(query(receiptsRef, orderBy('receiptDate', 'desc')));
        const receipts = receiptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        setFamilyReportData({ members, receipts });
      } catch (err) {
        console.error('Error cargando detalles de familia:', err);
      } finally {
        setLoadingFamily(false);
      }
    };
    fetchFamilyDetails();
  }, [selectedFamilyId, db]);

  // Generar constancia
  const generateCertificate = useCallback(async () => {
    if (!selectedEventId || !db) return;
    setCertLoading(true);
    try {
      const eventRef = doc(db, COLLECTION, DATA_DOCUMENT, 'deliveries', selectedEventId);
      const eventSnap = await getDoc(eventRef);
      if (!eventSnap.exists()) throw new Error('Evento no encontrado');
      
      const event = eventSnap.data();
      const deliveredIds = new Set(event.deliveredTo || []);
      const families = reportData?.familiesList || [];
      
      const received = [];
      const notReceived = [];
      
      for (const family of families) {
        const membersRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members');
        const membersSnap = await getDocs(membersRef);
        const hasReceived = membersSnap.docs.some(d => deliveredIds.has(d.id));
        (hasReceived ? received : notReceived).push(family);
      }
      setCertificateData({ received, notReceived });
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setCertLoading(false);
    }
  }, [db, selectedEventId, reportData?.familiesList]);

  // Handlers de PDF
  const handleDownloadGeneralPDF = useCallback(async () => {
    try {
      await generatePDF(generalPdfRef, 'reporte-general-clap.pdf');
    } catch {
      alert('❌ Error al generar el PDF general');
    }
  }, []);

  const handleDownloadFamilyPDF = useCallback(async () => {
    if (!selectedFamilyId) return;
    const family = reportData?.familiesList?.find(f => f.id === selectedFamilyId);
    const fileName = `reporte-familiar-${family?.familyName?.replace(/\s+/g, '-').toLowerCase() || 'familia'}.pdf`;
    try {
      await generatePDF(familyReportRef, fileName);
    } catch {
      alert('❌ Error al generar el PDF familiar');
    }
  }, [selectedFamilyId, reportData?.familiesList]);

  const toggleFilter = useCallback((filter) => {
    setActiveFilters(prev => ({ ...prev, [filter]: !prev[filter] }));
  }, []);

  useEffect(() => { fetchDeliveryEvents(); }, [fetchDeliveryEvents]);

  const filterLabels = {
    totalFamilies: 'Total de Familias',
    totalCommunityPopulation: 'Población Total',
    disabilityCount: 'Discapacidad',
    chronicIllnessCount: 'Enfermedades Crónicas',
    ageDistribution: 'Distribución por Edad',
    anthropometricCount: 'Control Antropométrico',
  };

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Cargando reportes...</span>
      </div>
    );
  }

  const selectedFamily = reportData?.familiesList?.find(f => f.id === selectedFamilyId);
  const gasReceipts = familyReportData.receipts.filter(r => 
    r.eventName?.toLowerCase().includes('gas') || r.eventName?.toLowerCase().includes('bombona')
  );

  return (
    <div className="space-y-10 p-4 bg-gray-50 rounded-xl max-w-7xl mx-auto">
      
      {/* ========================================== */}
      {/* SECCIÓN 1: REPORTES GENERALES (DISEÑO FORMAL) */}
      {/* ========================================== */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        
        {/* Controles de UI (NO se imprimen en PDF) */}
        <div className="flex flex-wrap justify-center gap-3 mb-6 print:hidden">
          <button onClick={refetch} className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2">🔄 Actualizar</button>
          <button onClick={handleDownloadGeneralPDF} className="bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition flex items-center gap-2">📄 Descargar PDF General</button>
          <button onClick={() => setShowFilters(!showFilters)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition">{showFilters ? 'Ocultar Filtros' : '⚙️ Filtrar'}</button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg shadow-inner mb-6 print:hidden">
            <h4 className="font-semibold mb-3">Filtros de Reporte</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(activeFilters).map(([key, enabled]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={enabled} onChange={() => toggleFilter(key)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm">{filterLabels[key]}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {reportsError && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md text-sm mb-6">
            {reportsError}
          </div>
        )}

        {/* VISTA DEL REPORTE GENERAL EN LA APLICACIÓN */}
        <div ref={reportsRef} className="bg-white">
          
          {/* RESUMEN EJECUTIVO */}
          <div className="bg-indigo-50 p-6 rounded-lg border-l-4 border-indigo-600 mb-8">
            <h3 className="text-xl font-bold text-indigo-800 mb-3">📊 Resumen Ejecutivo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-indigo-600">{reportData?.totalFamilies ?? 0}</p>
                <p className="text-sm text-gray-700">Familias Registradas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{reportData?.totalPopulation ?? 0}</p>
                <p className="text-sm text-gray-700">Población Total</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">{reportData?.disabilityCount ?? 0}</p>
                <p className="text-sm text-gray-700">Con Discapacidad</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">{reportData?.chronicIllnessCount ?? 0}</p>
                <p className="text-sm text-gray-700">Enf. Crónicas</p>
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS DETALLADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            
            {activeFilters.totalFamilies && (
              <div className="bg-blue-50 p-6 rounded-xl shadow-md border-2 border-blue-200">
                <h4 className="text-xl font-semibold text-blue-800 mb-2">🏠 Familias Registradas</h4>
                <p className="text-4xl font-bold text-blue-600">{reportData?.totalFamilies ?? 0}</p>
              </div>
            )}
            
            {activeFilters.totalCommunityPopulation && (
              <div className="bg-green-50 p-6 rounded-xl shadow-md border-2 border-green-200">
                <h4 className="text-xl font-semibold text-green-800 mb-2">👥 Población Total</h4>
                <p className="text-4xl font-bold text-green-600">{reportData?.totalPopulation ?? 0}</p>
                <div className="mt-4 pt-4 border-t-2 border-green-300">
                  <p className="font-bold text-green-800 mb-2">Distribución por Género:</p>
                  <ul className="text-sm space-y-1">
                    {Object.entries(reportData?.genderDistribution || {}).map(([g, c]) => 
                      c > 0 && <li key={g} className="flex justify-between"><span>{g}:</span><strong>{c}</strong></li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {activeFilters.disabilityCount && (
              <div className="bg-yellow-50 p-6 rounded-xl shadow-md border-2 border-yellow-200">
                <h4 className="text-xl font-semibold text-yellow-800 mb-2">♿ Personas con Discapacidad</h4>
                <p className="text-4xl font-bold text-yellow-600">{reportData?.disabilityCount ?? 0}</p>
              </div>
            )}
            
            {activeFilters.chronicIllnessCount && (
              <div className="bg-red-50 p-6 rounded-xl shadow-md border-2 border-red-200">
                <h4 className="text-xl font-semibold text-red-800 mb-2">🏥 Enfermedades Crónicas</h4>
                <p className="text-4xl font-bold text-red-600">{reportData?.chronicIllnessCount ?? 0}</p>
              </div>
            )}

            {activeFilters.ageDistribution && (
              <div className="bg-purple-50 p-6 rounded-xl shadow-md border-2 border-purple-200">
                <h4 className="text-xl font-semibold text-purple-800 mb-2">🎂 Distribución por Edades</h4>
                <ul className="text-sm space-y-2 mt-3">
                  {Object.entries(reportData?.ageDistribution || {}).map(([range, count]) => (
                    <li key={range} className="flex justify-between border-b border-purple-200 pb-1">
                      <span>{range}</span>
                      <strong className="text-purple-700">{count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activeFilters.anthropometricCount && (
              <div className="bg-orange-50 p-6 rounded-xl shadow-md border-2 border-orange-200">
                <h4 className="text-xl font-semibold text-orange-800 mb-2">📏 Control Antropométrico</h4>
                <p className="text-4xl font-bold text-orange-600">{reportData?.anthropometricCount ?? 0}</p>
                <p className="text-sm text-gray-600 mt-2">Miembros con datos registrados</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ========================================== */}
      {/* SECCIÓN 2: REPORTE INDIVIDUAL POR FAMILIA */}
      {/* ========================================== */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-2xl sm:text-3xl font-bold text-indigo-700 text-center mb-6 print:hidden">📋 Reporte Especializado por Familia</h2>
        
        <div className="max-w-md mx-auto mb-6 print:hidden">
          <label className="block text-gray-700 text-sm font-bold mb-2">Selecciona una Familia:</label>
          <select
            value={selectedFamilyId}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Seleccionar Familia --</option>
            {reportData?.familiesList?.map(f => (
              <option key={f.id} value={f.id}>{f.familyName} (CI: {f.cedulaJefe || 'N/A'})</option>
            ))}
          </select>
        </div>

        {selectedFamilyId && loadingFamily && (
          <div className="text-center text-gray-600 p-6">Cargando detalles de la familia...</div>
        )}

        {selectedFamilyId && !loadingFamily && selectedFamily && (
          <div ref={familyReportRef} className="bg-white p-8 rounded-xl border-2 border-gray-200 shadow-inner max-w-4xl mx-auto">
            
            {/* ENCABEZADO CON LOGO */}
            <div className="flex items-center gap-4 border-b-4 border-indigo-700 pb-4 mb-6">
              <img 
                src={logo} 
                alt="CC La Barranca" 
                className="h-20 w-auto"
              />
              <div className="flex-1 text-center">
                <h3 className="text-2xl font-bold text-gray-800">Consejo Comunal La Barranca</h3>
                <h4 className="text-xl font-semibold text-indigo-700 mt-1">Reporte Integral de Familia</h4>
                <p className="text-gray-600 text-sm mt-2">
                  Fecha de generación: <strong>{new Date().toLocaleDateString('es-VE', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</strong>
                </p>
              </div>
            </div>

            {/* Datos Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 bg-gray-50 p-4 rounded-lg">
              <div>
                <h5 className="font-bold text-gray-800 mb-2 border-b-2 border-gray-300 pb-1">📌 Datos del Hogar</h5>
                <p className="text-sm"><strong>Familia:</strong> {selectedFamily.familyName}</p>
                <p className="text-sm"><strong>Jefe de Familia:</strong> {familyReportData.members.find(m => m.isHead)?.memberName || 'No registrado'}</p>
                <p className="text-sm"><strong>C.I. Jefe:</strong> {selectedFamily.cedulaJefe || 'N/A'}</p>
                <p className="text-sm"><strong>Dirección:</strong> {selectedFamily.direccion || 'No registrada'}</p>
                <p className="text-sm"><strong>Teléfono:</strong> {selectedFamily.telefonoContacto || 'No registrado'}</p>
              </div>
              <div>
                <h5 className="font-bold text-gray-800 mb-2 border-b-2 border-gray-300 pb-1">📦 Resumen de Suministros</h5>
                <p className="text-sm"><strong>Total Miembros:</strong> {familyReportData.members.length}</p>
                <p className="text-sm"><strong>Entregas de Gas/Bombonas:</strong> {gasReceipts.length} eventos</p>
                <p className="text-sm"><strong>Total de Bolsas CLAP Recibidas:</strong> {familyReportData.receipts.reduce((sum, r) => sum + (r.bagQuantity || 0), 0)}</p>
                {selectedFamily.bombonas && selectedFamily.bombonas.length > 0 && (
                  <p className="text-sm mt-2"><strong>Cilindros Registrados:</strong> {selectedFamily.bombonas.length} ({selectedFamily.bombonas.map(b => b.tamano).join(', ')})</p>
                )}
              </div>
            </div>

            {/* Tabla de Miembros */}
            <div className="mb-6">
              <h5 className="font-bold text-gray-800 mb-3 text-lg"> Carga Familiar Detallada</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-indigo-100 text-indigo-900 font-semibold border-b-2 border-indigo-300">
                      <th className="p-2">Nombre</th>
                      <th className="p-2">Cédula</th>
                      <th className="p-2">Edad</th>
                      <th className="p-2">Rol</th>
                      <th className="p-2">Salud / Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {familyReportData.members.map((member) => (
                      <tr key={member.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{member.memberName}</td>
                        <td className="p-2">{member.memberCedula || 'N/A'}</td>
                        <td className="p-2">{member.age || 'N/A'} años</td>
                        <td className="p-2">{member.isHead ? <span className="text-indigo-600 font-bold">Jefe</span> : 'Miembro'}</td>
                        <td className="p-2">
                          {member.discapacidad && <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full mr-1">Discapacidad</span>}
                          {member.enfermedadCronica && <span className="inline-block bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full mr-1">Enf. Crónica</span>}
                          {member.controlAntropometrico && <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">Antropometría</span>}
                          {!member.discapacidad && !member.enfermedadCronica && !member.controlAntropometrico && <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Historial de Entregas */}
            <div>
              <h5 className="font-bold text-gray-800 mb-3 text-lg">🕒 Historial de Entregas Recientes</h5>
              {familyReportData.receipts.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No se registran entregas para esta familia.</p>
              ) : (
                <div className="space-y-2">
                  {familyReportData.receipts.slice(0, 5).map(receipt => (
                    <div key={receipt.id} className="p-3 border rounded-lg bg-gray-50 flex flex-col sm:flex-row justify-between text-sm gap-2">
                      <div>
                        <p className="font-bold text-gray-800">{receipt.eventName} <span className="text-xs font-normal text-gray-500">({receipt.eventDate})</span></p>
                        <p className="text-xs text-gray-600">Recibido por: {receipt.receivedBy?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-700">Bolsas: <strong>{receipt.bagQuantity}</strong></p>
                        {receipt.eventName?.toLowerCase().includes('gas') && <p className="text-orange-600 text-xs font-bold">🔥 Entrega de Gas</p>}
                      </div>
                    </div>
                  ))}
                  {familyReportData.receipts.length > 5 && (
                    <p className="text-xs text-gray-500 text-center mt-2">...y {familyReportData.receipts.length - 5} entregas más.</p>
                  )}
                </div>
              )}
            </div>

            {/* PIE DE PÁGINA CON FIRMA */}
            <div className="mt-12 pt-6 border-t-2 border-gray-300">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8 md:gap-4">
                <div className="text-center w-full md:w-1/2">
                  <div className="border-b-2 border-black w-3/4 mx-auto mb-2 h-12"></div>
                  <p className="font-bold text-gray-800 text-sm">___________________________</p>
                  <p className="text-sm font-semibold text-gray-700 mt-1">Vocera Principal Consejo Comunal</p>
                  <p className="text-xs text-gray-600">Consejo Comunal La Barranca</p>
                </div>
                <div className="text-center w-full md:w-1/3 flex flex-col items-center">
                  <div className="border-2 border-dashed border-gray-400 rounded-full w-24 h-24 flex items-center justify-center mb-2 bg-gray-50">
                    <span className="text-[10px] text-gray-500 text-center leading-tight px-2">
                      Espacio para<br/>Sello Húmedo<br/>del C.C.
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium mt-2">
                    Fecha de emisión: <span className="font-bold">{new Date().toLocaleDateString('es-VE')}</span>
                  </p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  Documento generado automáticamente por el Sistema de Información
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Consejo Comunal La Barranca • Este reporte es de carácter informativo y confidencial.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Botón de descarga independiente */}
        {selectedFamilyId && !loadingFamily && (
          <div className="text-center mt-6 print:hidden">
            <button
              onClick={handleDownloadFamilyPDF}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition duration-300 inline-flex items-center gap-2"
            >
              📄 Descargar Reporte de esta Familia (PDF)
            </button>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* SECCIÓN 3: CONSTANCIAS DE ENTREGA */}
      {/* ========================================== */}
      <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 print:hidden">
        <h3 className="text-xl font-bold text-indigo-700 mb-4">📜 Constancia de Entrega por Evento</h3>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
            disabled={certLoading}
          >
            <option value="">-- Seleccionar Evento --</option>
            {deliveryEvents.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.eventName} • {new Date(ev.eventDate).toLocaleDateString()}</option>
            ))}
          </select>
          <button
            onClick={generateCertificate}
            disabled={certLoading || !selectedEventId}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {certLoading ? <span className="animate-spin">⏳</span> : ' Generar Constancia'}
          </button>
        </div>

        {certificateData.received.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">✅ Recibieron ({certificateData.received.length})</h4>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {certificateData.received.map(f => <li key={f.id}>• {f.familyName} ({f.cedulaJefe})</li>)}
            </ul>
          </div>
        )}
        {certificateData.notReceived.length > 0 && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-800 mb-2">⏳ Pendientes ({certificateData.notReceived.length})</h4>
            <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
              {certificateData.notReceived.map(f => <li key={f.id}>• {f.familyName} ({f.cedulaJefe})</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* CONTENEDOR OCULTO PARA EL PDF GENERAL FORMAL */}
      {/* ========================================== */}
      <div
        ref={generalPdfRef}
        className="absolute top-0 left-[-9999px] w-[210mm] bg-white p-8 text-black"
      >
        {/* ENCABEZADO FORMAL */}
        <div className="flex items-center gap-4 border-b-4 border-indigo-700 pb-4 mb-6">
          <img src={logo} alt="CC La Barranca" className="h-20 w-auto" />
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-gray-800">Consejo Comunal La Barranca</h1>
            <h2 className="text-xl font-semibold text-indigo-700 mt-1">Reporte Estadístico General del Sistema CLAP</h2>
            <p className="text-gray-600 text-xs mt-1">
              Generado: {new Date().toLocaleDateString('es-VE')}
            </p>
          </div>
        </div>

        {/* RESUMEN EJECUTIVO EN GRID COMPACTO */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border-2 border-indigo-200 p-3 rounded text-center">
            <p className="text-xs text-gray-600 uppercase">Total de Familias</p>
            <p className="text-3xl font-bold text-indigo-700">{reportData?.totalFamilies ?? 0}</p>
          </div>
          <div className="border-2 border-green-200 p-3 rounded text-center">
            <p className="text-xs text-gray-600 uppercase">Población Total</p>
            <p className="text-3xl font-bold text-green-700">{reportData?.totalPopulation ?? 0}</p>
          </div>
          <div className="border-2 border-yellow-200 p-3 rounded text-center">
            <p className="text-xs text-gray-600 uppercase">Con Discapacidad</p>
            <p className="text-3xl font-bold text-yellow-600">{reportData?.disabilityCount ?? 0}</p>
          </div>
          <div className="border-2 border-red-200 p-3 rounded text-center">
            <p className="text-xs text-gray-600 uppercase">Enf. Crónicas</p>
            <p className="text-3xl font-bold text-red-700">{reportData?.chronicIllnessCount ?? 0}</p>
          </div>
        </div>

        {/* DETALLES DEMOGRÁFICOS EN 2 COLUMNAS */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-2 border-b-2 border-gray-300 pb-1">Distribución por Género</h4>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(reportData?.genderDistribution || {}).map(([g, c]) => (
                  <tr key={g} className="border-b border-gray-100">
                    <td className="py-1 text-gray-700">{g}</td>
                    <td className="py-1 text-right font-bold">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-800 mb-2 border-b-2 border-gray-300 pb-1">Distribución por Edades</h4>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(reportData?.ageDistribution || {}).map(([range, count]) => (
                  <tr key={range} className="border-b border-gray-100">
                    <td className="py-1 text-gray-700">{range}</td>
                    <td className="py-1 text-right font-bold">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CONTROL ANTROPOMÉTRICO */}
        <div className="border-2 border-orange-200 p-3 rounded mb-6 bg-orange-50 text-center">
          <p className="text-xs text-gray-700 uppercase font-semibold">Miembros con Control Antropométrico</p>
          <p className="text-2xl font-bold text-orange-700">{reportData?.anthropometricCount ?? 0}</p>
        </div>

        {/* FIRMA COMPACTA */}
        <div className="mt-8 pt-4 border-t-2 border-gray-300">
          <div className="flex justify-center">
            <div className="text-center w-2/3">
              <div className="border-b-2 border-black w-3/4 mx-auto mb-2 h-10"></div>
              <p className="font-bold text-gray-800 text-xs">___________________________</p>
              <p className="text-xs font-semibold text-gray-700 mt-1">Vocera Principal Consejo Comunal</p>
              <p className="text-xs text-gray-600">Consejo Comunal La Barranca</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Reports;
