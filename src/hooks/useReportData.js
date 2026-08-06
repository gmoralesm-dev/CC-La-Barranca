// src/hooks/useReportData.js
import { useCallback, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { COLLECTION, DATA_DOCUMENT } from '../firebase';

export const useReportData = (db) => {
  // ✅ ESTADO INICIAL COMPLETO (esto previene el error)
  const [reportData, setReportData] = useState({
    totalFamilies: 0,
    totalPopulation: 0,
    genderDistribution: { Masculino: 0, Femenino: 0, Otro: 0, 'N/A': 0 },
    ageDistribution: {
      '0-5 años': 0, '6-12 años': 0, '13-17 años': 0, 
      '18-25 años': 0, '26-40 años': 0, '41-60 años': 0, '60+ años': 0
    },
    disabilityCount: 0,
    chronicIllnessCount: 0,
    anthropometricCount: 0,
    familiesList: [] // ← ESTO ES CRÍTICO
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    if (!db) return;
    
    setLoading(true);
    setError('');
    
    try {
      const familiesRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families');
      const familiesSnap = await getDocs(familiesRef);
      const families = familiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let stats = {
        totalPopulation: 0,
        genderDistribution: { Masculino: 0, Femenino: 0, Otro: 0, 'N/A': 0 },
        ageDistribution: {
          '0-5 años': 0, '6-12 años': 0, '13-17 años': 0, 
          '18-25 años': 0, '26-40 años': 0, '41-60 años': 0, '60+ años': 0
        },
        disabilityCount: 0,
        chronicIllnessCount: 0,
        anthropometricCount: 0
      };

      for (const family of families) {
        const membersRef = collection(db, COLLECTION, DATA_DOCUMENT, 'families', family.id, 'members');
        const membersSnap = await getDocs(membersRef);
        
        membersSnap.docs.forEach(memberDoc => {
          const member = memberDoc.data();
          stats.totalPopulation++;
          
          const gender = member.memberGender || 'N/A';
          stats.genderDistribution[gender] = (stats.genderDistribution[gender] || 0) + 1;
          
          const age = Number(member.age);
          if (!isNaN(age) && age >= 0) {
            if (age <= 5) stats.ageDistribution['0-5 años']++;
            else if (age <= 12) stats.ageDistribution['6-12 años']++;
            else if (age <= 17) stats.ageDistribution['13-17 años']++;
            else if (age <= 25) stats.ageDistribution['18-25 años']++;
            else if (age <= 40) stats.ageDistribution['26-40 años']++;
            else if (age <= 60) stats.ageDistribution['41-60 años']++;
            else stats.ageDistribution['60+ años']++;
          }
          
          if (member.discapacidad) stats.disabilityCount++;
          if (member.enfermedadCronica) stats.chronicIllnessCount++;
          if (member.controlAntropometrico) stats.anthropometricCount++;
        });
      }

      // ✅ ACTUALIZA CON TODOS LOS CAMPOS
      setReportData({
        totalFamilies: families.length,
        familiesList: families,
        ...stats
      });

    } catch (err) {
      console.error('Report fetch error:', err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reportData, loading, error, refetch: fetchReports };
};
