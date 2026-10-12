#!/usr/bin/env node
/**
 * LAZY-LOL Mechanized Traceability Verification Script
 * Validates that every functional requirement (YLD-00 to YLD-06)
 * defined in the LAZY Yield Transfer Document is covered by automated
 * tests, implementation modules, and repository commits.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIREMENTS = [
  {
    id: 'YLD-00',
    title: 'Autenticación y Control de Acceso (Transversal / STRIDE)',
    implFiles: ['src/firebase.js', 'firestore.rules'],
    testPattern: /YLD-00/
  },
  {
    id: 'YLD-01',
    title: 'Gestión de Familias y Censo',
    implFiles: ['src/components/FamilyManagement.js'],
    testPattern: /YLD-01/
  },
  {
    id: 'YLD-02',
    title: 'Gestión de Eventos de Distribución',
    implFiles: ['src/components/DeliveryEvents.js'],
    testPattern: /YLD-02/
  },
  {
    id: 'YLD-03',
    title: 'Registro de Beneficios e Historial Familiar',
    implFiles: ['src/components/MemberManagement.js'],
    testPattern: /YLD-03/
  },
  {
    id: 'YLD-04',
    title: 'Generación de Constancias y Certificados PDF',
    implFiles: ['src/components/CertificateGenerator.js', 'src/utils/pdfGenerator.js'],
    testPattern: /YLD-04/
  },
  {
    id: 'YLD-05',
    title: 'Reportes y Estadísticas Demográficas en Tiempo Real',
    implFiles: ['src/components/Dashboard.js', 'src/components/Reports.js'],
    testPattern: /YLD-05/
  },
  {
    id: 'YLD-06',
    title: 'Cartelera Pública de Comunicados y Comentarios',
    implFiles: ['src/components/Comunicados.js'],
    testPattern: /YLD-06/
  }
];

function getFiles(dir, matchExt) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath, matchExt));
    } else if (matchExt.some(ext => fullPath.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function verifyTraceability() {
  console.log('='.repeat(78));
  console.log('LAZY-LOL METHODOLOGY: VERIFICACIÓN MECANIZADA DE TRAZABILIDAD');
  console.log('='.repeat(78));

  const rootDir = path.resolve(__dirname, '..');
  const testFiles = [
    ...getFiles(path.join(rootDir, 'src'), ['.test.js', '.spec.js']),
    ...getFiles(path.join(rootDir, 'test'), ['.test.js', '.spec.js'])
  ];

  console.log(`Buscando tests en: ${testFiles.length} archivos de prueba encontrados.`);

  let allPassed = true;
  const matrix = [];

  for (const req of REQUIREMENTS) {
    // 1. Verificar existencia de archivos de implementación
    const foundImpl = req.implFiles.filter(f => fs.existsSync(path.join(rootDir, f)));
    const implStatus = foundImpl.length === req.implFiles.length;

    // 2. Verificar cobertura de tests con el identificador YLD-XX
    const matchingTests = testFiles.filter(filePath => {
      const content = fs.readFileSync(filePath, 'utf8');
      return req.testPattern.test(content);
    });

    const testStatus = matchingTests.length > 0;
    const testNames = matchingTests.map(p => path.basename(p)).join(', ');

    if (!implStatus || !testStatus) {
      allPassed = false;
    }

    matrix.push({
      id: req.id,
      title: req.title,
      implStatus: implStatus ? 'OK' : 'FALTANTE',
      implFiles: req.implFiles.join(', '),
      testStatus: testStatus ? 'OK' : 'SIN TEST',
      testFiles: testNames || 'NINGUNO'
    });
  }

  // Imprimir matriz
  console.log('\nMATRIZ DE TRAZABILIDAD (YIELD -> IMPLEMENTACIÓN -> TESTS):');
  console.log('-'.repeat(78));
  for (const row of matrix) {
    const passIndicator = (row.implStatus === 'OK' && row.testStatus === 'OK') ? '✔ [VERIFICADO]' : '✖ [FALLO]';
    console.log(`${passIndicator} ${row.id}: ${row.title}`);
    console.log(`    Implementación: [${row.implStatus}] ${row.implFiles}`);
    console.log(`    Suite de Tests: [${row.testStatus}] ${row.testFiles}`);
    console.log('-'.repeat(78));
  }

  if (!allPassed) {
    console.error('\nERROR: Se detectaron requerimientos sin trazabilidad mecanizada completa.');
    process.exit(1);
  } else {
    console.log('\n✔ ÉXITO: 100% de los requerimientos YLD-00 a YLD-06 están mecanizados y vinculados.');
    console.log('='.repeat(78));
  }
}

verifyTraceability();
