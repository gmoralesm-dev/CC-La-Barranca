import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, COLLECTION, DATA_DOCUMENT } from '../firebase';
import logo from '../assets/logo-cc-la-barranca.png';
import './Dashboard.css';

const Dashboard = ({ userRole, onNavigate }) => {
  // Estados para los contadores en tiempo real
  const [numFamilies, setNumFamilies] = useState(0);
  const [numDeliveries, setNumDeliveries] = useState(0);
  const [numComunicados, setNumComunicados] = useState(0);
  const [showLogoModal, setShowLogoModal] = useState(false);

  const isManager = ['lider_de_calle', 'administrador', 'admin', 'vocera_principal', 'vocera', 'vocero'].includes(userRole);

  useEffect(() => {
    let unsubFamilies = () => {};
    let unsubDeliveries = () => {};

    // 1. Escuchar cambios en Familias (solo para gestores con permiso)
    if (isManager) {
      const qFamilies = query(collection(db, COLLECTION, DATA_DOCUMENT, "families"));
      unsubFamilies = onSnapshot(qFamilies, (snapshot) => {
        setNumFamilies(snapshot.size);
      }, (error) => console.error("Error contando familias:", error));

      // 2. Escuchar cambios en Eventos (solo para gestores con permiso)
      const qDeliveries = query(collection(db, COLLECTION, DATA_DOCUMENT, "deliveries"));
      unsubDeliveries = onSnapshot(qDeliveries, (snapshot) => {
        setNumDeliveries(snapshot.size);
      }, (error) => console.error("Error contando eventos:", error));
    }

    // 3. Escuchar cambios en Comunicados (público)
    const qComunicados = query(collection(db, COLLECTION, DATA_DOCUMENT, "comunicados"));
    const unsubComunicados = onSnapshot(qComunicados, (snapshot) => {
      setNumComunicados(snapshot.size);
    }, (error) => console.error("Error contando comunicados:", error));

    // Limpieza de los listeners al desmontar el componente
    return () => {
      unsubFamilies();
      unsubDeliveries();
      unsubComunicados();
    };
  }, [isManager]);

  const stats = [
    { label: "Familias Registradas", value: numFamilies, icon: "👥", color: "blue" },
    { label: "Entregas Realizadas", value: numDeliveries, icon: "📦", color: "green" },
    { label: "Comunicados Activos", value: numComunicados, icon: "📢", color: "orange" },
    { label: "Año Fiscal / Censo", value: "2026", icon: "📋", color: "red" }
  ];

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
