import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db, COLLECTION, DATA_DOCUMENT } from '../firebase'; // Verifica que la ruta sea correcta
import './Dashboard.css';

const Dashboard = () => {
  // Estados para los contadores en tiempo real
  const [numFamilies, setNumFamilies] = useState(0);
  const [numDeliveries, setNumDeliveries] = useState(0);
  const [numComunicados, setNumComunicados] = useState(0);

  useEffect(() => {
    // 1. Escuchar cambios en la sub-colección de Familias
    const qFamilies = query(collection(db, COLLECTION, DATA_DOCUMENT, "families"));
    const unsubFamilies = onSnapshot(qFamilies, (snapshot) => {
      setNumFamilies(snapshot.size);
    }, (error) => console.error("Error contando familias:", error));

    // 2. Escuchar cambios en la sub-colección de Eventos (Entregas)
    // Nota: Asegúrate de que el nombre coincide con el de tus otros componentes
    const qDeliveries = query(collection(db, COLLECTION, DATA_DOCUMENT, "deliveries"));
    const unsubDeliveries = onSnapshot(qDeliveries, (snapshot) => {
      setNumDeliveries(snapshot.size);
    }, (error) => console.error("Error contando eventos:", error));

    // 3. Escuchar cambios en la sub-colección de Comunicados
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
  }, []);

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
        <div className="hero-text">
          <h1>Consejo Comunal La Barranca</h1>
          <p>Sistema de Gestión Comunitaria y Control de Beneficios</p>
        </div>
      </header>

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
          </div>
        </div>

        <div className="quick-info">
          <h3>Estado del Sistema</h3>
          <div className="status-indicator">
            <span className="dot pulse"></span>
            <p>Servidores de Base de Datos: <strong>Conectados</strong></p>
          </div>
          <p className="last-sync">Sincronización en tiempo real activa</p>
        </div>
      </main>

      <footer className="dashboard-footer">
        <p>© 2026 Consejo Comunal La Barranca - Gestión Tecnológica</p>
      </footer>
    </div>
  );
};

export default Dashboard;
