import { collection, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

const migrateUsers = async () => {
  console.log('Starting user migration...');

  const oldUsersCollectionRef = collection(db, 'CLAP-La-Barranca', 'data', 'users');
  const newUsersCollectionRef = collection(db, 'users');

  try {
    const userDocsSnapshot = await getDocs(oldUsersCollectionRef);
    let migratedCount = 0;

    if (userDocsSnapshot.empty) {
      console.log('No users found in the old "users" collection. Nothing to migrate.');
      return;
    }

    for (const userDoc of userDocsSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;

      // We only want to migrate registered users, not guests.
      // This assumes guests have a 'role' field set to 'guest'.
      if (userData.role !== 'guest') {
        console.log(`Migrating user: ${userId}`);

        // Set the document in the new 'registered_users' collection
        await setDoc(doc(newUsersCollectionRef, userId), userData);

        // **Optional: Delete the old document**
        // Uncomment the line below if you want to delete the user from the old 'users' collection after migration.
        // Make sure you have a backup of your data before doing this.
        // await deleteDoc(doc(oldUsersCollectionRef, userId));

        migratedCount++;
      } else {
        console.log(`Skipping guest user: ${userId}`);
      }
    }

    console.log(`Migration complete. Migrated ${migratedCount} registered users.`);

  } catch (error) {
    console.error('Error during migration:', error);
  }
};

// To run the migration, you can call this function from a temporary button in your UI,
// or by exposing it in a way that you can call it from your browser's developer console.
// For example, you could add a button to your Dashboard component:
// <button onClick={migrateUsers}>Migrate Users</button>
//
// Or, to run it from the console, you could expose it on the window object (for development only):
// window.migrateUsers = migrateUsers;

export default migrateUsers;
