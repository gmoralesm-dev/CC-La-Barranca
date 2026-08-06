import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth, COLLECTION, DATA_DOCUMENT, USERS_COLLECTION, INVITADOS_COLLECTION } from './firebase';

// Import management components
import FamilyManagement from './components/FamilyManagement';
import DeliveryEvents from './components/DeliveryEvents';
import Reports from './components/Reports';
import Dashboard from './components/Dashboard';
import Comunicados from './components/Comunicados';
import logo from './assets/logo-cc-la-barranca.png';

const App = () => {
    const [userId, setUserId] = useState(null);
    const [userRole, setUserRole] = useState(null); 
    const [userEmail, setUserEmail] = useState(''); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [currentPage, setCurrentPage] = useState('dashboard'); 
    const [isGuestLogin, setIsGuestLogin] = useState(false); 
    const [guestName, setGuestName] = useState(''); 
    const [loadingAuth, setLoadingAuth] = useState(true); 

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
                setUserEmail(user.email || '');
                setIsGuestLogin(false);
                setError('');

                const adminDocRef = doc(db, COLLECTION, DATA_DOCUMENT, USERS_COLLECTION, user.uid);
                
                try {
                    const adminSnap = await getDoc(adminDocRef);

                    if (!adminSnap.exists()) {
                        if (user.uid === process.env.REACT_APP_INITIAL_ADMIN_UID || user.email === process.env.REACT_APP_INITIAL_ADMIN_EMAIL) {
                            console.log("Bootstrap: Initializing admin record...");
                            const adminData = {
                                email: user.email,
                                role: "administrador", 
                                nombre: "Gabriel Admin",
                                uid: user.uid,
                                createdAt: new Date()
                            };
                            await setDoc(adminDocRef, adminData);
                            setUserRole("administrador");
                        } else {
                            const guestDocRef = doc(db, COLLECTION, DATA_DOCUMENT, INVITADOS_COLLECTION, user.uid);
                            const guestSnap = await getDoc(guestDocRef);
                            if (guestSnap.exists()) {
                                setUserRole(guestSnap.data().role || 'guest');
                            } else {
                                setUserRole("desconocido");
                                setError("No se encontró el perfil en la base de datos. Si usas el emulador, puede que se haya limpiado.");
                            }
                        }
                    } else {
                        setUserRole(adminSnap.data().role || 'administrador');
                    }
                } catch (err) {
                    console.error("Auth State Error:", err);
                    setError("Error al verificar permisos.");
                }
            } else {
                setUserId(null);
                setUserRole(null);
                setUserEmail('');
            }
            setLoadingAuth(false);
        });

        return () => unsubscribeAuth();
    }, []);

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (e) {
            setError('Credenciales inválidas: ' + e.message);
        }
    };

    const handleGuestLogin = async (e) => {
        e.preventDefault();
        if (!guestName.trim()) {
            setError('Ingresa tu nombre.');
            return;
        }
        try {
            const userCredential = await signInAnonymously(auth);
            await setDoc(doc(db, COLLECTION, DATA_DOCUMENT, INVITADOS_COLLECTION, userCredential.user.uid), {
                email: `invitado_${userCredential.user.uid}@comunidad.local`,
                fullName: guestName,
                role: 'guest',
                createdAt: new Date()
            });
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setEmail('');
            setPassword('');
        } catch (e) {
            console.error(e);
        }
    };

    const isManagerRole = () => {
        const managers = ['lider_de_calle', 'administrador', 'admin', 'vocera_principal', 'vocera', 'vocero'];
        return managers.includes(userRole);
    };

    if (loadingAuth) {
        return <div className="flex items-center justify-center min-h-screen">Cargando...</div>;
    }

    if (!userId) {
        if (isGuestLogin) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                        <h2 className="text-2xl font-bold text-center text-indigo-700 mb-6">Acceso Invitado</h2>
                        {error && <p className="text-red-500 mb-4">{error}</p>}
                        <input 
                            type="text" 
                            placeholder="Tu Nombre" 
                            className="w-full p-3 border rounded-lg mb-4"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                        />
                        <div className="flex gap-2">
                            <button onClick={handleGuestLogin} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg">Entrar</button>
                            <button onClick={() => setIsGuestLogin(false)} className="flex-1 bg-gray-400 text-white py-3 rounded-lg">Volver</button>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
                    <div className="flex justify-center mb-6">
                        <img src={logo} alt="Logo CC La Barranca" className="h-24 object-contain" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-center text-indigo-700 mb-8 leading-tight">
                        Consejo Comunal<br/>La Barranca
                    </h1>
                    {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
                    <form onSubmit={handleSignIn} className="space-y-4">
                        <input 
                            type="email" 
                            placeholder="Email" 
                            className="w-full p-3 border rounded-lg"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input 
                            type="password" 
                            placeholder="Contraseña" 
                            className="w-full p-3 border rounded-lg"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold">Entrar</button>
                        <button type="button" onClick={() => setIsGuestLogin(true)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold">Entrar como Invitado</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-6">
                <header className="flex flex-col md:flex-row justify-between items-center border-b pb-6 mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <img src={logo} alt="Logo" className="h-12 w-auto" />
                        <h1 className="text-xl font-bold text-indigo-800 text-center md:text-left">
                            Consejo Comunal La Barranca
                        </h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-700">{userEmail}</p>
                            <p className="text-xs text-indigo-500 uppercase font-semibold">{userRole || 'Verificando...'}</p>
                        </div>
                        <button onClick={handleSignOut} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm">Cerrar Sesión</button>
                    </div>
                </header>

                <nav className="flex flex-wrap justify-center gap-2 mb-8">
                    <button onClick={() => setCurrentPage('dashboard')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Dashboard</button>
                    
                    {isManagerRole() && (
                        <>
                            <button onClick={() => setCurrentPage('families')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'families' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Familias</button>
                            <button onClick={() => setCurrentPage('deliveries')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'deliveries' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Entregas</button>
                        </>
                    )}

                    <button onClick={() => setCurrentPage('reports')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'reports' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Reportes</button>
                    <button onClick={() => setCurrentPage('comunicados')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'comunicados' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Comunicados</button>
                </nav>

                <main className="bg-gray-50 rounded-xl p-4 min-h-[400px]">
                    {currentPage === 'dashboard' && <Dashboard />}
                    {currentPage === 'families' && isManagerRole() && <FamilyManagement db={db} userId={userId} />}
                    {currentPage === 'deliveries' && isManagerRole() && <DeliveryEvents db={db} userId={userId} />}
                    {currentPage === 'reports' && <Reports db={db} userId={userId} />}
                    {currentPage === 'comunicados' && <Comunicados db={db} userId={userId} userRole={userRole} userFullName={userEmail} />}
                </main>
            </div>
        </div>
    );
};

export default App;
