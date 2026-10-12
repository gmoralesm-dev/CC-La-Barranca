const { describe, it: test, before: beforeAll, after: afterAll, beforeEach } = require('node:test');
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'demo-cc-la-barranca-test';

describe('Firestore Security Rules - [YLD-00] Oversight Executable Tests', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: fs.readFileSync(path.resolve(__dirname, '../firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080
      }
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  test('[F1/STRIDE-E] Un usuario común o invitado NO puede autoasignarse rol de administrador (prevención de Self-Promotion)', async () => {
    const unprivilegedUid = 'user-normal-123';
    const userContext = testEnv.authenticatedContext(unprivilegedUid);
    const db = userContext.firestore();
    const userDocRef = doc(db, 'Consejo-Comunal-La-Barranca', 'data', 'users', unprivilegedUid);

    // Intento de ataque F1: autoasignarse rol administrador (Elevation of Privilege)
    await assertFails(
      setDoc(userDocRef, {
        displayName: 'Atacante',
        email: 'attacker@test.com',
        role: 'administrador'
      })
    );
  });

  test('[F1/STRIDE-E] Un usuario común SÍ puede crear su perfil con rol por defecto (guest/desconocido) o sin rol', async () => {
    const normalUid = 'user-normal-456';
    const userContext = testEnv.authenticatedContext(normalUid);
    const db = userContext.firestore();
    const userDocRef = doc(db, 'Consejo-Comunal-La-Barranca', 'data', 'users', normalUid);

    await assertSucceeds(
      setDoc(userDocRef, {
        displayName: 'Vecino Comunitario',
        email: 'vecino@test.com',
        role: 'guest'
      })
    );
  });

  test('[F1/STRIDE-E] Un usuario común NO puede modificar su rol existente para promoverse a administrador', async () => {
    const normalUid = 'user-normal-789';
    
    // Usuario ya creado previamente como guest
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'Consejo-Comunal-La-Barranca', 'data', 'users', normalUid), {
        displayName: 'Vecino',
        role: 'guest'
      });
    });

    const userContext = testEnv.authenticatedContext(normalUid);
    const db = userContext.firestore();
    const userDocRef = doc(db, 'Consejo-Comunal-La-Barranca', 'data', 'users', normalUid);

    // Intento de update a administrador debe ser rechazado
    await assertFails(
      updateDoc(userDocRef, {
        role: 'administrador'
      })
    );
  });

  test('[F1/STRIDE-E] Solo un manager/administrador legítimo puede asignar roles elevados', async () => {
    const adminUid = 'admin-legitimo-999';
    const targetUid = 'user-promovido-111';

    // Configuramos al admin legítimo en la base de datos usando contexto privilegiado
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, 'Consejo-Comunal-La-Barranca', 'data', 'users', adminUid), {
        displayName: 'Vocera Principal',
        role: 'administrador'
      });
    });

    const adminContext = testEnv.authenticatedContext(adminUid);
    const db = adminContext.firestore();
    const targetDocRef = doc(db, 'Consejo-Comunal-La-Barranca', 'data', 'users', targetUid);

    // El administrador legítimo sí puede asignar roles elevados
    await assertSucceeds(
      setDoc(targetDocRef, {
        displayName: 'Nuevo Líder de Calle',
        role: 'lider_de_calle'
      })
    );
  });

  test('[STRIDE-S/I] Usuarios no autenticados o comunes NO pueden leer datos del padrón familiar sensible (families)', async () => {
    const unauthedContext = testEnv.unauthenticatedContext();
    const db = unauthedContext.firestore();
    const familyDocRef = doc(db, 'Consejo-Comunal-La-Barranca', 'data', 'families', 'familia-001');

    await assertFails(getDoc(familyDocRef));
  });

  test('[STRIDE-D] Comunicados públicos son legibles por cualquiera pero solo managers pueden publicar', async () => {
    const unauthedContext = testEnv.unauthenticatedContext();
    const db = unauthedContext.firestore();
    const postDocRef = doc(db, 'Consejo-Comunal-La-Barranca', 'data', 'comunicados', 'noticia-01');

    // Lectura pública permitida
    await assertSucceeds(getDoc(postDocRef));

    // Intento de publicación no autorizada debe fallar
    await assertFails(
      setDoc(postDocRef, {
        title: 'Spam Post',
        content: 'Denegación de servicio por contenido no autorizado'
      })
    );
  });
});
