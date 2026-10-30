import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth, COLLECTION, DATA_DOCUMENT, USERS_COLLECTION, INVITADOS_COLLECTION } from './firebase';

// Import management components
import FamilyManagement from './components/FamilyManagement';
import DeliveryEvents from './components/DeliveryEvents';
import Reports from './components/Reports';
import Dashboard from './components/Dashboard';
import Comunicados from './components/Comunicados';
import SettingsPanel from './components/SettingsPanel';
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
    const [avatarUrl, setAvatarUrl] = useState(''); 
    const [displayName, setDisplayName] = useState('');

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

                    if (adminSnap.exists()) {
                        const adminData = adminSnap.data();
                        setUserRole(adminData.role || 'desconocido');
                        setAvatarUrl(adminData.avatarUrl || user.photoURL || '');
                        setDisplayName(adminData.displayName || adminData.nombre || user.displayName || '');
                    } else {
                        const guestDocRef = doc(db, COLLECTION, DATA_DOCUMENT, INVITADOS_COLLECTION, user.uid);
                        const guestSnap = await getDoc(guestDocRef);
                        if (guestSnap.exists()) {
                            const guestData = guestSnap.data();
                            setUserRole(guestData.role || 'guest');
                            setAvatarUrl(guestData.avatarUrl || user.photoURL || '');
                            setDisplayName(guestData.displayName || guestData.fullName || user.displayName || '');
                        } else {
                            // If user document does not exist yet (e.g. first-time Google sign-in),
                            // automatically create a base profile with default 'guest' role and Google info
                            const newUserData = {
                                uid: user.uid,
                                email: user.email || '',
                                displayName: user.displayName || '',
                                nombre: user.displayName || '',
                                avatarUrl: user.photoURL || '',
                                role: 'guest',
                                createdAt: new Date()
                            };
                            try {
                                await setDoc(adminDocRef, newUserData);
                                setUserRole('guest');
                                setAvatarUrl(user.photoURL || '');
                                setDisplayName(user.displayName || '');
                            } catch (createErr) {
                                console.warn("Could not create user document:", createErr);
                                setUserRole("desconocido");
                                setAvatarUrl(user.photoURL || '');
                                setDisplayName(user.displayName || '');
                            }
                        }
                    }
                } catch (err) {
                    console.error("Auth State Error:", err);
                    setError("Error al verificar permisos.");
                }
            } else {
                setUserId(null);
                setUserRole(null);
                setUserEmail('');
                setAvatarUrl('');
                setDisplayName('');
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

    const handleGoogleSignIn = async () => {
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (e) {
            if (e.code !== 'auth/popup-closed-by-user') {
                setError('Error al iniciar sesión con Google: ' + e.message);
            }
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
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition">Entrar</button>

                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-gray-500 font-semibold">o continuar con</span>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            onClick={handleGoogleSignIn} 
                            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition shadow-sm"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <span>Iniciar sesión con Google</span>
                        </button>

                        <button type="button" onClick={() => setIsGuestLogin(true)} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition">Entrar como Invitado</button>
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
                            <p className="text-sm font-bold text-gray-700">{displayName || userEmail}</p>
                            <p className="text-xs text-indigo-500 uppercase font-semibold">{userRole || 'Verificando...'}</p>
                        </div>
                        <SettingsPanel
                            userId={userId}
                            userRole={userRole}
                            userEmail={userEmail}
                            displayName={displayName}
                            setDisplayName={setDisplayName}
                            avatarUrl={avatarUrl}
                            setAvatarUrl={setAvatarUrl}
                            onSignOut={handleSignOut}
                        />
                    </div>
                </header>

                <nav className="flex flex-wrap justify-center gap-2 mb-8">
                    <button onClick={() => setCurrentPage('dashboard')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'dashboard' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Dashboard</button>
                    
                    {isManagerRole() && (
                        <>
                            <button onClick={() => setCurrentPage('families')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'families' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Familias</button>
                            <button onClick={() => setCurrentPage('deliveries')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'deliveries' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Entregas</button>
                            <button onClick={() => setCurrentPage('reports')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'reports' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Reportes</button>
                        </>
                    )}

                    <button onClick={() => setCurrentPage('comunicados')} className={`px-4 py-2 rounded-full text-sm font-bold transition ${currentPage === 'comunicados' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Comunicados</button>
                </nav>

                <main className="bg-gray-50 rounded-xl p-4 min-h-[400px]">
                    {currentPage === 'dashboard' && <Dashboard userRole={userRole} />}
                    {currentPage === 'families' && isManagerRole() && <FamilyManagement db={db} userId={userId} />}
                    {currentPage === 'deliveries' && isManagerRole() && <DeliveryEvents db={db} userId={userId} />}
                    {currentPage === 'reports' && isManagerRole() && <Reports db={db} userId={userId} />}
                    {currentPage === 'comunicados' && <Comunicados db={db} userId={userId} userRole={userRole} userFullName={displayName || userEmail} />}
                </main>
            </div>
        </div>
    );
};

export default App;
