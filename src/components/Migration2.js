import React, { useState } from 'react';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, COLLECTION, DATA_DOCUMENT, USERS_COLLECTION } from '../firebase';

const Migration2 = () => {
    const [migrationStatus, setMigrationStatus] = useState('');

    const handleMigrateUsers = async () => {
        setMigrationStatus('Starting user migration...');
        console.log('Starting user migration...');

        try {
            const oldUsersCollectionRef = collection(db, 'users');
            const oldUsersSnapshot = await getDocs(oldUsersCollectionRef);
            let migratedCount = 0;

            if (oldUsersSnapshot.empty) {
                setMigrationStatus('No users found in the old collection. Nothing to migrate.');
                console.log('No users found in the old collection. Nothing to migrate.');
                return;
            }

            const migrationPromises = oldUsersSnapshot.docs.map(async (userDoc) => {
                const userId = userDoc.id;
                const userData = userDoc.data();

                // Skip guest users if they exist in the old collection
                if (userData.role === 'guest') {
                    console.log(`Skipping guest user: ${userId}`);
                    return;
                }

                console.log(`Migrating user: ${userId}`);
                const newUserDocRef = doc(db, COLLECTION, DATA_DOCUMENT, USERS_COLLECTION, userId);
                await setDoc(newUserDocRef, userData);
                migratedCount++;
            });

            await Promise.all(migrationPromises);

            const statusMessage = `Migration complete. Migrated ${migratedCount} registered users.`;
            setMigrationStatus(statusMessage);
            console.log(statusMessage);

        } catch (error) {
            const errorMessage = `Error during migration: ${error.message}`;
            setMigrationStatus(errorMessage);
            console.error(errorMessage);
        }
    };

    return (
        <div className="p-4 border rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">User Migration</h2>
            <p className="mb-4">
                Click the button below to migrate registered users from the old top-level 'users' collection to the new nested 'users' collection inside 'CLAP-La-Barranca/data'.
            </p>
            <button
                onClick={handleMigrateUsers}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
            >
                Migrate Users
            </button>
            {migrationStatus && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <p className="font-semibold">Migration Status:</p>
                    <p>{migrationStatus}</p>
                </div>
            )}
        </div>
    );
};

export default Migration2;
