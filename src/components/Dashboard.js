import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, COLLECTION, DATA_DOCUMENT } from '../firebase';
import logo from '../assets/logo-cc-la-barranca.png';
import './Dashboard.css';

const Dashboard = ({ userRole, onNavigate }) => {
  // Estados para contadores y analítica en tiempo real
  const [numFamilies, setNumFamilies] = useState(0);
  const [numDeliveries, setNumDeliveries] = useState(0);
  const [numComunicados, setNumComunicados] = useState(0);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [gasStats, setGasStats] = useState({ total: 0, c10: 0, c18: 0, c43: 0, cOther: 0 });
  const [latestDelivery, setLatestDelivery] = useState(null);
  const [latestComunicado, setLatestComunicado] = useState(null);

  const isManager = ['lider_de_calle', 'administrador', 'admin', 'vocera_principal', 'vocera', 'vocero'].includes(userRole);

  useEffect(() => {
    let unsubFamilies = () => {};
    let unsubDeliveries = () => {};

    // 1. Escuchar cambios en Familias y calcular métricas de gas (solo para gestores con permiso)
    if (isManager) {
      const qFamilies = query(collection(db, COLLECTION, DATA_DOCUMENT, "families"));
      unsubFamilies = onSnapshot(qFamilies, (snapshot) => {
        setNumFamilies(snapshot.size || (snapshot.docs ? snapshot.docs.length : 0));
        let total = 0, c10 = 0, c18 = 0, c43 = 0, cOther = 0;
        const docs = snapshot.docs || [];
        docs.forEach(docSnap => {
          const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
          if (Array.isArray(data.bombonas)) {
            data.bombonas.forEach(b => {
              total++;
              const t = (b.tamano || '').toLowerCase();
              if (t.includes('10')) c10++;
              else if (t.includes('18')) c18++;
              else if (t.includes('43')) c43++;
              else cOther++;
            });
          }
        });
        setGasStats({ total, c10, c18, c43, cOther });
      }, (error) => console.error("Error contando familias:", error));

      // 2. Escuchar cambios en Eventos y obtener el más reciente
      const qDeliveries = query(collection(db, COLLECTION, DATA_DOCUMENT, "deliveries"));
      unsubDeliveries = onSnapshot(qDeliveries, (snapshot) => {
        setNumDeliveries(snapshot.size || (snapshot.docs ? snapshot.docs.length : 0));
        const deliveriesData = (snapshot.docs || []).map(d => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d) }));
        if (deliveriesData.length > 0) {
          const sorted = [...deliveriesData].sort((a, b) => {
            const dateA = a.eventDate ? new Date(a.eventDate).getTime() : 0;
            const dateB = b.eventDate ? new Date(b.eventDate).getTime() : 0;
            return dateB - dateA;
          });
          setLatestDelivery(sorted[0]);
        } else {
          setLatestDelivery(null);
        }
      }, (error) => console.error("Error contando eventos:", error));
    }

    // 3. Escuchar cambios en Comunicados y obtener el más reciente (público)
    const qComunicados = query(collection(db, COLLECTION, DATA_DOCUMENT, "comunicados"));
    const unsubComunicados = onSnapshot(qComunicados, (snapshot) => {
      setNumComunicados(snapshot.size || (snapshot.docs ? snapshot.docs.length : 0));
      const comsData = (snapshot.docs || []).map(d => ({ id: d.id, ...(typeof d.data === 'function' ? d.data() : d) }));
      if (comsData.length > 0) {
        const sorted = [...comsData].sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
          return tB - tA;
        });
        setLatestComunicado(sorted[0]);
      } else {
        setLatestComunicado(null);
      }
    }, (error) => console.error("Error contando comunicados:", error));

    return () => {
      unsubFamilies();
      unsubDeliveries();
      unsubComunicados();
    };
  }, [isManager]);

  const stats = [
    { label: "Familias Registradas", value: numFamilies, icon: "👥", color: "blue" },
    { label: "Entregas Realizadas", value: numDeliveries, icon: "📦", color: "green" },
    { label: "Cilindros de Gas (GLP)", value: gasStats.total, icon: "🔥", color: "red" },
    { label: "Comunicados Activos", value: numComunicados, icon: "📢", color: "orange" }
  ];

  const pct10 = gasStats.total > 0 ? Math.round((gasStats.c10 / gasStats.total) * 100) : 0;
  const pct18 = gasStats.total > 0 ? Math.round((gasStats.c18 / gasStats.total) * 100) : 0;
  const pct43 = gasStats.total > 0 ? Math.round((gasStats.c43 / gasStats.total) * 100) : 0;
  const avgCylinders = numFamilies > 0 ? (gasStats.total / numFamilies).toFixed(1) : 0;

  return (
    <div className="dashboard-container">
      <div className="branding-bar">
        <div className="bar-segment red"></div>
        <div className="bar-segment green"></div>
        <div className="bar-segment blue"></div>
        <div className="bar-segment orange"></div>
      </div>

      <header className="dashboard-hero">
        <div className="hero-main">
          <img src={logo} alt="Imagotipo CC La Barranca" className="hero-logo-img" />
          <div className="hero-text">
            <span className="hero-badge">📍 Trujillo, Venezuela • Sector La Barranca</span>
            <h1>Consejo Comunal La Barranca</h1>
            <p>Sistema de Gestión Comunitaria y Control de Beneficios</p>
          </div>
        </div>

        <button 
          onClick={() => setShowLogoModal(true)}
          className="story-btn"
          title="Conocer la historia del imagotipo comunitario"
        >
          <span>🏛️</span> Historia del Imagotipo
        </button>
      </header>

      {/* Barra de Acciones Rápidas (Quick Actions) */}
      {onNavigate && (
        <section className="quick-actions-bar">
          <p className="quick-actions-title">⚡ Acciones Rápidas de Gestión</p>
          <div className="quick-actions-grid">
            {isManager ? (
              <>
                <button onClick={() => onNavigate('families')} className="action-btn">
                  <span>👥</span>
                  <span>Gestionar Familias</span>
                </button>
                <button onClick={() => onNavigate('deliveries')} className="action-btn">
                  <span>📦</span>
                  <span>Eventos y Jornadas</span>
                </button>
                <button onClick={() => onNavigate('reports')} className="action-btn">
                  <span>📊</span>
                  <span>Constancias y Reportes</span>
                </button>
                <button onClick={() => onNavigate('comunicados')} className="action-btn">
                  <span>📢</span>
                  <span>Publicar Comunicado</span>
                </button>
              </>
            ) : (
              <button onClick={() => onNavigate('comunicados')} className="action-btn">
                <span>📢</span>
                <span>Ver Tablón de Comunicados</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Tarjetas Principales de Métricas */}
      <section className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Analítica Visual de Servicios: Demanda de Gas Comunal */}
      {isManager && (
        <section className="analytics-card">
          <div className="analytics-header">
            <div>
              <span className="analytics-badge">🔥 Servicios Básicos & Soberanía Energética</span>
              <h3>Distribución de Demanda de Gas Licuado (GLP)</h3>
            </div>
            <span className="analytics-meta">Promedio Comunal: <strong>{avgCylinders}</strong> cil./familia</span>
          </div>

          <div className="gas-bars-grid">
            <div className="gas-stat-box">
              <div className="gas-box-top">
                <span className="gas-cap-label">10 kg (Doméstica)</span>
                <span className="gas-count-val">{gasStats.c10} cil. <small>({pct10}%)</small></span>
              </div>
              <div className="progress-track">
                <div className="progress-fill blue" style={{ width: `${pct10}%` }}></div>
              </div>
            </div>

            <div className="gas-stat-box">
              <div className="gas-box-top">
                <span className="gas-cap-label">18 kg (Mediana)</span>
                <span className="gas-count-val">{gasStats.c18} cil. <small>({pct18}%)</small></span>
              </div>
              <div className="progress-track">
                <div className="progress-fill orange" style={{ width: `${pct18}%` }}></div>
              </div>
            </div>

            <div className="gas-stat-box">
              <div className="gas-box-top">
                <span className="gas-cap-label">43 kg (Comercial / Grande)</span>
                <span className="gas-count-val">{gasStats.c43} cil. <small>({pct43}%)</small></span>
              </div>
              <div className="progress-track">
                <div className="progress-fill red" style={{ width: `${pct43}%` }}></div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Actividad Comunitaria Reciente: Último Evento y Último Comunicado */}
      <section className="activity-grid">
        <div className="activity-card">
          <div className="activity-card-header">
            <span className="activity-icon">📦</span>
            <div>
              <h4>Próxima Jornada o Evento Reciente</h4>
              <p>Seguimiento de entregas y distribución de beneficios</p>
            </div>
          </div>

          {latestDelivery ? (
            <div className="activity-body">
              <div className="activity-highlight-box">
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-gray-900 font-bold">{latestDelivery.eventName}</strong>
                  <span className="event-date-pill">📅 {latestDelivery.eventDate || 'Fecha por confirmar'}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{latestDelivery.eventDescription}</p>
              </div>
              {onNavigate && isManager && (
                <button onClick={() => onNavigate('deliveries')} className="activity-action-link">
                  Ver detalle de eventos →
                </button>
              )}
            </div>
          ) : (
            <div className="activity-empty">
              <p>No se registran eventos activos en este momento.</p>
              {onNavigate && isManager && (
                <button onClick={() => onNavigate('deliveries')} className="activity-action-btn">
                  ➕ Planificar Evento
                </button>
              )}
            </div>
          )}
        </div>

        <div className="activity-card">
          <div className="activity-card-header">
            <span className="activity-icon">📢</span>
            <div>
              <h4>Último Comunicado a la Comunidad</h4>
              <p>Avisos, asambleas y convocatorias populares</p>
            </div>
          </div>

          {latestComunicado ? (
            <div className="activity-body">
              <div className="activity-highlight-box">
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-gray-900 font-bold">{latestComunicado.title || 'Aviso Oficial'}</strong>
                  <span className="comunicado-author-pill">✍️ {latestComunicado.authorFullName || 'Vocería'}</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{latestComunicado.content}</p>
              </div>
              {onNavigate && (
                <button onClick={() => onNavigate('comunicados')} className="activity-action-link">
                  Ir al tablón de anuncios →
                </button>
              )}
            </div>
          ) : (
            <div className="activity-empty">
              <p>No hay comunicados publicados recientemente.</p>
              {onNavigate && isManager && (
                <button onClick={() => onNavigate('comunicados')} className="activity-action-btn">
                  📢 Publicar Aviso
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Contenido Secundario: Misión Legal & Salud de Servidores */}
      <main className="dashboard-content">
        <div className="info-box">
          <h2>Misión y Marco Legal</h2>
          <p>
            Garantizar la organización popular para la distribución eficiente 
            de beneficios y el fortalecimiento del tejido social en nuestra comunidad.
          </p>
          <div className="action-links">
            <a 
              href="https://www.comunas.gob.ve/wp-content/uploads/2023/09/Ley_Organica_Consejos_Comunales_2023.pdf" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="legal-button"
            >
              📄 Ley Orgánica de los Consejos Comunales
            </a>

            <button 
              onClick={() => setShowLogoModal(true)} 
              className="identity-text-link"
            >
              🏛️ Conocer identidad y memoria histórica
            </button>
          </div>
        </div>

        <div className="quick-info">
          <h3>Estado del Sistema</h3>
          <div className="status-indicator">
            <span className="dot pulse"></span>
            <p>Servidores de Base de Datos: <strong>Conectados</strong></p>
          </div>
          <p className="last-sync">Sincronización en tiempo real activa</p>
          
          <div className="user-role-badge-box">
            <span className="user-role-label">Tu Rol de Acceso:</span>
            <span className="user-role-pill">{userRole || 'invitado'}</span>
          </div>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>© 2026 Consejo Comunal La Barranca - Gestión Tecnológica • Metodología LAZY-LOL</p>
      </footer>

      {/* Modal de Memoria Histórica del Imagotipo */}
      {showLogoModal && (
        <div className="modal-overlay" onClick={() => setShowLogoModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close-btn"
              onClick={() => setShowLogoModal(false)}
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            <div className="modal-header-logo">
              <img src={logo} alt="Imagotipo histórico" className="modal-logo-img" />
              <div>
                <span className="modal-tag">Marco LAZY — Fase Zoom • Validación Comunitaria</span>
                <h2 className="modal-title">Identidad Visual y Memoria Histórica</h2>
                <p className="modal-subtitle">Catedral Nuestra Señora de la Paz — Trujillo (Fachada Histórica)</p>
              </div>
            </div>

            <div className="modal-body-content">
              <div className="history-callout">
                <h4>🏛️ El Hecho Histórico (1678)</h4>
                <p>
                  El imagotipo del Consejo Comunal representa la fachada de la Catedral de Trujillo en su estado arquitectónico 
                  anterior a las remodelaciones municipales recientes. Esta fachada conserva el testimonio vivo del templo 
                  que sobrevivió al asalto, saqueo e incendio perpetrado por el filibustero francés 
                  <strong> Grammont de la Mothe</strong> en 1678.
                </p>
              </div>

              <div className="ethnographic-callout">
                <h4>🤝 Decisión Etnográfica con la Comunidad</h4>
                <p>
                  Durante las sesiones de trabajo de campo con la <strong>Vocera Principal (Mgtr. Evelyn Hackett)</strong> y 
                  los voceros de calle, la propia comunidad manifestó que las modificaciones estéticas modernas 
                  reducían el peso de su memoria colectiva. 
                </p>
                <p className="mt-2">
                  Siguiendo el principio de investigación <em>LAZY (Listen, Analyze, Zoom, Yield)</em>, se priorizó 
                  la memoria y la identidad patrimonial de los vecinos por encima de una apariencia institucional genérica.
                </p>
              </div>

              <div className="modal-badges-row">
                <span className="spec-badge">📍 Parroquia Chiquinquirá</span>
                <span className="spec-badge">🛡️ Resistencia y Patrimonio</span>
                <span className="spec-badge">📐 Vectorizado para SIW-CC</span>
              </div>
            </div>

            <div className="modal-footer-action">
              <button 
                className="modal-understood-btn"
                onClick={() => setShowLogoModal(false)}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
