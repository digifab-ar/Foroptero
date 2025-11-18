/**
 * MOTOR DE EXAMEN VISUAL
 * 
 * State Machine que maneja toda la lógica del examen visual.
 * El agente solo ejecuta pasos, el backend decide TODO.
 */

// Estado global del examen (en memoria para MVP)
let estadoExamen = {
  // Identificación
  sessionId: null,
  
  // Etapa actual
  etapa: 'INICIO', // 'INICIO' | 'ETAPA_1' | 'ETAPA_2' | 'ETAPA_3' | 'ETAPA_4' | 'ETAPA_5' | 'FINALIZADO'
  subEtapa: null,
  
  // Datos del examen
  valoresIniciales: {
    R: { esfera: null, cilindro: null, angulo: null },
    L: { esfera: null, cilindro: null, angulo: null }
  },
  valoresRecalculados: {
    R: { esfera: null, cilindro: null, angulo: null },
    L: { esfera: null, cilindro: null, angulo: null }
  },
  
  // Progreso por ojo
  ojoActual: 'R',
  
  // Agudeza visual
  agudezaVisual: {
    R: { logmar: null, letra: null, confirmado: false },
    L: { logmar: null, letra: null, confirmado: false }
  },
  
  // Tests de lentes
  lentes: {
    R: {
      esfericoGrueso: { valor: null, confirmado: false },
      esfericoFino: { valor: null, confirmado: false },
      cilindrico: { valor: null, confirmado: false }
    },
    L: {
      esfericoGrueso: { valor: null, confirmado: false },
      esfericoFino: { valor: null, confirmado: false },
      cilindrico: { valor: null, confirmado: false }
    }
  },
  
  // Estado de comparación (para tests de lentes)
  comparacionActual: {
    tipo: null,
    ojo: null,
    lente1: null,
    lente2: null,
    primeraEleccion: null,
    segundaEleccion: null,
    valorBase: null
  },
  
  // Estado de agudeza (para navegación logMAR)
  agudezaEstado: {
    ojo: null,
    logmarActual: null,
    letraActual: null,
    mejorLogmar: null,
    ultimoLogmarCorrecto: null,
    letrasUsadas: [],
    intentos: 0,
    confirmaciones: 0
  },
  
  // Respuesta pendiente del paciente (para procesamiento)
  respuestaPendiente: null,
  
  // Secuencia del examen
  secuenciaExamen: {
    testsActivos: [], // Array de { tipo, ojo }
    indiceActual: 0,
    testActual: null, // { tipo: 'agudeza_inicial', ojo: 'R' }
    resultados: {
      R: {
        agudezaInicial: null,
        esfericoGrueso: null,
        esfericoFino: null,
        cilindrico: null,
        cilindricoAngulo: null,
        agudezaAlcanzada: null
      },
      L: {
        agudezaInicial: null,
        esfericoGrueso: null,
        esfericoFino: null,
        cilindrico: null,
        cilindricoAngulo: null,
        agudezaAlcanzada: null
      }
    }
  },
  
  // Timestamps
  iniciado: null,
  finalizado: null
};

/**
 * Inicializa el examen (resetea todo el estado)
 */
export function inicializarExamen() {
  estadoExamen = {
    sessionId: null,
    etapa: 'INICIO',
    subEtapa: null,
    valoresIniciales: {
      R: { esfera: null, cilindro: null, angulo: null },
      L: { esfera: null, cilindro: null, angulo: null }
    },
    valoresRecalculados: {
      R: { esfera: null, cilindro: null, angulo: null },
      L: { esfera: null, cilindro: null, angulo: null }
    },
    ojoActual: 'R',
    agudezaVisual: {
      R: { logmar: null, letra: null, confirmado: false },
      L: { logmar: null, letra: null, confirmado: false }
    },
    lentes: {
      R: {
        esfericoGrueso: { valor: null, confirmado: false },
        esfericoFino: { valor: null, confirmado: false },
        cilindrico: { valor: null, confirmado: false }
      },
      L: {
        esfericoGrueso: { valor: null, confirmado: false },
        esfericoFino: { valor: null, confirmado: false },
        cilindrico: { valor: null, confirmado: false }
      }
    },
    comparacionActual: {
      tipo: null,
      ojo: null,
      lente1: null,
      lente2: null,
      primeraEleccion: null,
      segundaEleccion: null,
      valorBase: null
    },
    agudezaEstado: {
      ojo: null,
      logmarActual: null,
      letraActual: null,
      mejorLogmar: null,
      ultimoLogmarCorrecto: null,
      letrasUsadas: [],
      intentos: 0,
      confirmaciones: 0
    },
    respuestaPendiente: null,
    secuenciaExamen: {
      testsActivos: [],
      indiceActual: 0,
      testActual: null,
      resultados: {
        R: {
          agudezaInicial: null,
          esfericoGrueso: null,
          esfericoFino: null,
          cilindrico: null,
          cilindricoAngulo: null,
          agudezaAlcanzada: null
        },
        L: {
          agudezaInicial: null,
          esfericoGrueso: null,
          esfericoFino: null,
          cilindrico: null,
          cilindricoAngulo: null,
          agudezaAlcanzada: null
        }
      }
    },
    iniciado: Date.now(),
    finalizado: null
  };
  
  console.log('✅ Examen inicializado');
  return estadoExamen;
}

/**
 * Valida y parsea los valores iniciales del autorefractómetro
 * Formato esperado: "<R> +0.75 , -1.75 , 60 / <L> +2.75 , 0.00 , 0"
 */
export function validarValoresIniciales(texto) {
  if (!texto || typeof texto !== 'string') {
    return { valido: false, error: 'El texto está vacío o no es válido' };
  }
  
  // Limpiar el texto
  const textoLimpio = texto.trim();
  
  // Patrón regex para validar formato
  // Formato: <R> esfera, cilindro, angulo / <L> esfera, cilindro, angulo
  const patron = /<R>\s*([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)\s*,\s*(\d+)\s*\/\s*<L>\s*([+-]?\d+\.?\d*)\s*,\s*([+-]?\d+\.?\d*)\s*,\s*(\d+)/i;
  
  const match = textoLimpio.match(patron);
  
  if (!match) {
    return { 
      valido: false, 
      error: 'Formato incorrecto. Ejemplo: <R> +0.75 , -1.75 , 60 / <L> +2.75 , 0.00 , 0' 
    };
  }
  
  // Extraer valores
  const valores = {
    R: {
      esfera: parseFloat(match[1]),
      cilindro: parseFloat(match[2]),
      angulo: parseInt(match[3])
    },
    L: {
      esfera: parseFloat(match[4]),
      cilindro: parseFloat(match[5]),
      angulo: parseInt(match[6])
    }
  };
  
  // Validar rangos
  if (valores.R.angulo < 0 || valores.R.angulo > 180) {
    return { valido: false, error: 'El ángulo del ojo derecho debe estar entre 0 y 180' };
  }
  
  if (valores.L.angulo < 0 || valores.L.angulo > 180) {
    return { valido: false, error: 'El ángulo del ojo izquierdo debe estar entre 0 y 180' };
  }
  
  return { valido: true, valores };
}

/**
 * Procesa una respuesta del paciente según la etapa actual
 */
export function procesarRespuesta(respuestaPaciente) {
  if (!respuestaPaciente || typeof respuestaPaciente !== 'string') {
    return { ok: false, error: 'Respuesta inválida' };
  }
  
  console.log(`📥 Procesando respuesta en etapa ${estadoExamen.etapa}:`, respuestaPaciente);
  
  switch (estadoExamen.etapa) {
    case 'ETAPA_1':
      return procesarRespuestaEtapa1(respuestaPaciente);
    
    case 'ETAPA_2':
      // Etapa 2 es silenciosa, no procesa respuestas del paciente
      // El recálculo se hace automáticamente en generarPasos()
      return { ok: true };
    
    case 'ETAPA_3':
      // Etapa 3: después de configurar el foróptero, cualquier respuesta del paciente
      // significa que está listo, pasar a ETAPA_4
      if (estadoExamen.subEtapa === 'FOROPTERO_CONFIGURADO') {
        estadoExamen.etapa = 'ETAPA_4';
        estadoExamen.ojoActual = 'R';
        estadoExamen.subEtapa = 'AGUDEZA_R';
        console.log('✅ Foróptero configurado, pasando a ETAPA_4');
      }
      return { ok: true };
    
    default:
      return { ok: false, error: `Etapa ${estadoExamen.etapa} no implementada aún` };
  }
}

/**
 * Procesa respuesta de la Etapa 1 (recolección de valores)
 */
function procesarRespuestaEtapa1(respuestaPaciente) {
  const validacion = validarValoresIniciales(respuestaPaciente);
  
  if (!validacion.valido) {
    // Generar pasos de error
    return {
      ok: true,
      pasos: [
        {
          tipo: 'hablar',
          orden: 1,
          mensaje: `Los valores no están completos o no tienen el formato correcto. Revisalos por favor. Ejemplo: <R> +0.75 , -1.75 , 60 / <L> +2.75 , 0.00 , 0`
        }
      ]
    };
  }
  
  // Guardar valores
  estadoExamen.valoresIniciales = validacion.valores;
  estadoExamen.etapa = 'ETAPA_2';
  
  console.log('✅ Valores iniciales guardados:', validacion.valores);
  
  // La Etapa 2 se procesa automáticamente en generarPasos()
  return { ok: true };
}

/**
 * Genera pasos atómicos según la etapa actual
 */
export function generarPasos() {
  console.log(`🔧 Generando pasos para etapa: ${estadoExamen.etapa}`);
  
  switch (estadoExamen.etapa) {
    case 'INICIO':
      return generarPasosInicio();
    
    case 'ETAPA_1':
      return generarPasosEtapa1();
    
    case 'ETAPA_2':
      return generarPasosEtapa2();
    
    case 'ETAPA_3':
      return generarPasosEtapa3();
    
    case 'ETAPA_4':
      // Se implementará en Fase 3
      return {
        ok: false,
        error: `Etapa ${estadoExamen.etapa} no implementada aún`
      };
    
    default:
      return {
        ok: false,
        error: `Etapa ${estadoExamen.etapa} no implementada aún`
      };
  }
}

/**
 * Genera pasos para INICIO
 */
function generarPasosInicio() {
  estadoExamen.etapa = 'ETAPA_1';
  
  return {
    ok: true,
    pasos: [
      {
        tipo: 'hablar',
        orden: 1,
        mensaje: 'Hola, escribí los valores del autorefractómetro antes de iniciar el test. Ejemplo de formato: <R> +0.75 , -1.75 , 60 / <L> +2.75 , 0.00 , 0'
      }
    ],
    contexto: {
      etapa: 'ETAPA_1',
      subEtapa: null
    }
  };
}

/**
 * Genera pasos para ETAPA_1
 */
function generarPasosEtapa1() {
  // Si ya hay valores guardados, significa que se validaron correctamente
  // y ya se pasó a ETAPA_2, así que no deberíamos estar aquí
  if (estadoExamen.valoresIniciales.R.esfera !== null) {
    // Ya se procesaron los valores, generar pasos de confirmación breve
    return {
      ok: true,
      pasos: [
        {
          tipo: 'hablar',
          orden: 1,
          mensaje: 'Perfecto, los valores son correctos. Vamos a comenzar.'
        }
      ]
    };
  }
  
  // Si no hay valores, pedirlos de nuevo
  return {
    ok: true,
    pasos: [
      {
        tipo: 'hablar',
        orden: 1,
        mensaje: 'Escribí los valores del autorefractómetro. Ejemplo: <R> +0.75 , -1.75 , 60 / <L> +2.75 , 0.00 , 0'
      }
    ]
  };
}

/**
 * Aplica las reglas de recálculo cilíndrico según protocolo clínico
 * @param {number} cilindro - Valor cilíndrico original
 * @returns {number} - Valor cilíndrico recalculado
 */
export function aplicarRecalculoCilindrico(cilindro) {
  // Reglas de ajuste:
  // - Cilindro entre -0.50 y -2.00 (inclusive) → sumar +0.50 (menos negativo)
  // - Entre -2.25 y -4.00 (inclusive) → sumar +0.75
  // - Entre -4.25 y -6.00 (inclusive) → sumar +1.50
  // - Si es 0 o -0.25 → mantener igual
  // - Si es menor a -6.00 → no modificar
  
  // NOTA: Para números negativos, "entre X y Y" significa:
  // cilindro <= X (más negativo) && cilindro >= Y (menos negativo)
  // Los valores entre rangos (ej: entre -2.00 y -2.25) se tratan con la regla más cercana
  
  if (cilindro === 0 || cilindro === -0.25) {
    return cilindro; // Mantener igual
  }
  
  if (cilindro < -6.00) {
    return cilindro; // No modificar
  }
  
  // Entre -0.50 y -2.00 (inclusive): cilindro <= -0.50 && cilindro >= -2.00
  if (cilindro <= -0.50 && cilindro >= -2.00) {
    return cilindro + 0.50; // Sumar +0.50
  }
  
  // Entre -2.00 y -2.25 (gap): aplicar regla de -2.25 a -4.00 (más cercana)
  // O mejor: extender el rango -0.50 a -2.00 hasta -2.24 para cubrir el gap
  if (cilindro < -2.00 && cilindro > -2.25) {
    // Valores entre -2.00 y -2.25: aplicar regla de -2.25 (sumar +0.75)
    return cilindro + 0.75;
  }
  
  // Entre -2.25 y -4.00 (inclusive): cilindro <= -2.25 && cilindro >= -4.00
  if (cilindro <= -2.25 && cilindro >= -4.00) {
    return cilindro + 0.75; // Sumar +0.75
  }
  
  // Entre -4.00 y -4.25 (gap): aplicar regla de -4.25 a -6.00 (más cercana)
  if (cilindro < -4.00 && cilindro > -4.25) {
    // Valores entre -4.00 y -4.25: aplicar regla de -4.25 (sumar +1.50)
    return cilindro + 1.50;
  }
  
  // Entre -4.25 y -6.00 (inclusive): cilindro <= -4.25 && cilindro >= -6.00
  if (cilindro <= -4.25 && cilindro >= -6.00) {
    return cilindro + 1.50; // Sumar +1.50
  }
  
  // Para valores fuera de los rangos definidos (ej: entre -0.25 y -0.50), mantener igual
  return cilindro;
}

/**
 * Determina qué tests de cilindro incluir según el valor del cilindro recalculado
 * @param {number} cilindro - Valor cilíndrico recalculado
 * @returns {object} - Configuración de tests activos
 */
function determinarTestsActivos(cilindro) {
  const tests = {
    cilindrico: false,
    cilindricoAngulo: false
  };
  
  if (cilindro === 0 || cilindro === -0.25) {
    // No incluir tests de cilindro
    tests.cilindrico = false;
    tests.cilindricoAngulo = false;
  } else if (cilindro >= -0.50 && cilindro <= -1.75) {
    // Incluir test de cilindro, pero NO de ángulo
    tests.cilindrico = true;
    tests.cilindricoAngulo = false;
  } else if (cilindro >= -2.00 && cilindro <= -6.00) {
    // Incluir ambos tests
    tests.cilindrico = true;
    tests.cilindricoAngulo = true;
  }
  
  return tests;
}

/**
 * Genera la secuencia completa del examen basada en valores recalculados
 * @returns {array} - Array de tests activos en orden de ejecución
 */
function generarSecuenciaExamen() {
  const valoresR = estadoExamen.valoresRecalculados.R;
  const valoresL = estadoExamen.valoresRecalculados.L;
  
  // Determinar tests activos para cada ojo
  const testsR = determinarTestsActivos(valoresR.cilindro);
  const testsL = determinarTestsActivos(valoresL.cilindro);
  
  // Construir secuencia de tests activos
  const secuencia = [];
  
  // OJO DERECHO (R)
  secuencia.push({ tipo: 'agudeza_inicial', ojo: 'R' });
  secuencia.push({ tipo: 'esferico_grueso', ojo: 'R' });
  secuencia.push({ tipo: 'esferico_fino', ojo: 'R' });
  
  if (testsR.cilindrico) {
    secuencia.push({ tipo: 'cilindrico', ojo: 'R' });
  }
  
  if (testsR.cilindricoAngulo) {
    secuencia.push({ tipo: 'cilindrico_angulo', ojo: 'R' });
  }
  
  secuencia.push({ tipo: 'agudeza_alcanzada', ojo: 'R' });
  
  // OJO IZQUIERDO (L)
  secuencia.push({ tipo: 'agudeza_inicial', ojo: 'L' });
  secuencia.push({ tipo: 'esferico_grueso', ojo: 'L' });
  secuencia.push({ tipo: 'esferico_fino', ojo: 'L' });
  
  if (testsL.cilindrico) {
    secuencia.push({ tipo: 'cilindrico', ojo: 'L' });
  }
  
  if (testsL.cilindricoAngulo) {
    secuencia.push({ tipo: 'cilindrico_angulo', ojo: 'L' });
  }
  
  secuencia.push({ tipo: 'agudeza_alcanzada', ojo: 'L' });
  
  // Binocular (opcional, se implementará después)
  // secuencia.push({ tipo: 'binocular', ojo: 'B' });
  
  return secuencia;
}

/**
 * Obtiene el test actual que se está ejecutando
 * @returns {object|null} - Test actual o null si no hay
 */
export function obtenerTestActual() {
  return estadoExamen.secuenciaExamen.testActual;
}

/**
 * Avanza al siguiente test en la secuencia
 * @returns {object|null} - Nuevo test actual o null si se completó el examen
 */
export function avanzarTest() {
  const secuencia = estadoExamen.secuenciaExamen;
  
  if (secuencia.indiceActual >= secuencia.testsActivos.length - 1) {
    // Se completó el examen
    estadoExamen.etapa = 'FINALIZADO';
    estadoExamen.finalizado = Date.now();
    secuencia.testActual = null;
    return null;
  }
  
  // Avanzar al siguiente test
  secuencia.indiceActual += 1;
  secuencia.testActual = secuencia.testsActivos[secuencia.indiceActual];
  
  console.log(`➡️ Avanzando a test: ${secuencia.testActual.tipo} (${secuencia.testActual.ojo})`);
  
  return secuencia.testActual;
}

/**
 * Genera pasos para ETAPA_2 (cálculo silencioso)
 * Esta etapa no genera pasos visibles, solo procesa internamente
 */
function generarPasosEtapa2() {
  // Aplicar recálculo cilíndrico a ambos ojos
  const valoresR = { ...estadoExamen.valoresIniciales.R };
  const valoresL = { ...estadoExamen.valoresIniciales.L };
  
  valoresR.cilindro = aplicarRecalculoCilindrico(valoresR.cilindro);
  valoresL.cilindro = aplicarRecalculoCilindrico(valoresL.cilindro);
  
  // Guardar valores recalculados
  estadoExamen.valoresRecalculados = {
    R: valoresR,
    L: valoresL
  };
  
  // Pasar a ETAPA_3
  estadoExamen.etapa = 'ETAPA_3';
  
  console.log('✅ Valores recalculados:');
  console.log('  Iniciales R:', estadoExamen.valoresIniciales.R);
  console.log('  Recalculados R:', estadoExamen.valoresRecalculados.R);
  console.log('  Iniciales L:', estadoExamen.valoresIniciales.L);
  console.log('  Recalculados L:', estadoExamen.valoresRecalculados.L);
  
  // Esta etapa es silenciosa, no genera pasos visibles
  // La transición a ETAPA_3 se hace automáticamente
  // Generar pasos de ETAPA_3 inmediatamente
  return generarPasosEtapa3();
}

/**
 * Genera pasos para ETAPA_3 (preparación del foróptero y definición de secuencia)
 */
function generarPasosEtapa3() {
  // Verificar si ya se generaron los pasos de ETAPA_3
  // Si ya se generaron, no volver a generarlos (evitar loop)
  if (estadoExamen.subEtapa === 'FOROPTERO_CONFIGURADO') {
    // Ya se configuró el foróptero, pasar a ETAPA_4
    estadoExamen.etapa = 'ETAPA_4';
    estadoExamen.ojoActual = estadoExamen.secuenciaExamen.testActual?.ojo || 'R';
    
    // Retornar pasos vacíos para que el agente espere respuesta
    // (ETAPA_4 se implementará en Fase 3)
    return {
      ok: true,
      pasos: [],
      contexto: {
        etapa: 'ETAPA_4',
        testActual: estadoExamen.secuenciaExamen.testActual
      }
    };
  }
  
  // 1. Generar secuencia completa del examen
  const secuencia = generarSecuenciaExamen();
  
  // 2. Guardar secuencia en el estado
  estadoExamen.secuenciaExamen.testsActivos = secuencia;
  estadoExamen.secuenciaExamen.indiceActual = 0;
  estadoExamen.secuenciaExamen.testActual = secuencia[0] || null;
  
  console.log('✅ Secuencia del examen generada:');
  console.log('  Total de tests:', secuencia.length);
  console.log('  Tests activos:', secuencia.map(t => `${t.tipo}(${t.ojo})`).join(', '));
  console.log('  Test actual:', estadoExamen.secuenciaExamen.testActual);
  
  // 3. Usar valores recalculados para configurar el foróptero
  const valoresR = estadoExamen.valoresRecalculados.R;
  const valoresL = estadoExamen.valoresRecalculados.L;
  
  // Configuración inicial:
  // - Ojo derecho (R): valores recalculados, oclusión: "open"
  // - Ojo izquierdo (L): oclusión: "close"
  
  // 4. Marcar que se generaron los pasos (para evitar regenerarlos)
  estadoExamen.subEtapa = 'FOROPTERO_CONFIGURADO';
  
  // 5. Establecer ojo actual según el primer test
  estadoExamen.ojoActual = estadoExamen.secuenciaExamen.testActual?.ojo || 'R';
  
  // 6. Pasar a ETAPA_4 (el primer test se ejecutará en Etapa 4)
  estadoExamen.etapa = 'ETAPA_4';
  
  return {
    ok: true,
    pasos: [
      {
        tipo: 'foroptero',
        orden: 1,
        foroptero: {
          R: {
            esfera: valoresR.esfera,
            cilindro: valoresR.cilindro,
            angulo: valoresR.angulo,
            occlusion: 'open'
          },
          L: {
            occlusion: 'close'
          }
        }
      },
      {
        tipo: 'esperar',
        orden: 2,
        esperarSegundos: 2
      },
      {
        tipo: 'hablar',
        orden: 3,
        mensaje: 'Vamos a empezar con este ojo.'
      }
    ],
    contexto: {
      etapa: 'ETAPA_4',
      testActual: estadoExamen.secuenciaExamen.testActual,
      totalTests: secuencia.length,
      indiceActual: 0
    }
  };
}

/**
 * Obtiene instrucciones (pasos) para el agente
 * Si hay respuestaPaciente, la procesa primero
 */
export function obtenerInstrucciones(respuestaPaciente = null) {
  // Si hay respuesta del paciente, procesarla primero
  if (respuestaPaciente) {
    const resultado = procesarRespuesta(respuestaPaciente);
    
    if (!resultado.ok) {
      return {
        ok: false,
        error: resultado.error || 'Error procesando respuesta'
      };
    }
    
    // Si el procesamiento generó pasos (ej: error de validación), retornarlos
    if (resultado.pasos) {
      return {
        ok: true,
        pasos: resultado.pasos,
        contexto: {
          etapa: estadoExamen.etapa,
          subEtapa: estadoExamen.subEtapa
        }
      };
    }
  }
  
  // Generar pasos según la etapa actual
  const pasos = generarPasos();
  
  if (!pasos.ok) {
    return pasos;
  }
  
  // Si la etapa generó pasos vacíos (como ETAPA_2 silenciosa),
  // generar pasos de la siguiente etapa automáticamente
  if (pasos.pasos && pasos.pasos.length === 0) {
    // La etapa cambió internamente, generar pasos de la nueva etapa
    const nuevosPasos = generarPasos();
    if (nuevosPasos.ok) {
      return {
        ok: true,
        pasos: nuevosPasos.pasos || [],
        contexto: nuevosPasos.contexto || {
          etapa: estadoExamen.etapa,
          subEtapa: estadoExamen.subEtapa
        }
      };
    }
  }
  
  return {
    ok: true,
    pasos: pasos.pasos || [],
    contexto: pasos.contexto || {
      etapa: estadoExamen.etapa,
      subEtapa: estadoExamen.subEtapa
    }
  };
}

/**
 * Obtiene el estado actual del examen
 */
export function obtenerEstado() {
  return {
    ok: true,
    estado: {
      etapa: estadoExamen.etapa,
      ojoActual: estadoExamen.ojoActual,
      testActual: estadoExamen.secuenciaExamen.testActual,
      totalTests: estadoExamen.secuenciaExamen.testsActivos.length,
      indiceActual: estadoExamen.secuenciaExamen.indiceActual,
      progreso: calcularProgreso(),
      ultimaAccion: obtenerUltimaAccion()
    }
  };
}

/**
 * Calcula el progreso del examen (0-100%)
 */
function calcularProgreso() {
  // Placeholder - se implementará cuando todas las etapas estén listas
  const etapas = ['INICIO', 'ETAPA_1', 'ETAPA_2', 'ETAPA_3', 'ETAPA_4', 'ETAPA_5', 'FINALIZADO'];
  const etapaActual = etapas.indexOf(estadoExamen.etapa);
  return Math.round((etapaActual / (etapas.length - 1)) * 100);
}

/**
 * Obtiene descripción de la última acción
 */
function obtenerUltimaAccion() {
  switch (estadoExamen.etapa) {
    case 'INICIO':
      return 'Iniciando examen';
    case 'ETAPA_1':
      return 'Esperando valores del autorefractómetro';
    case 'ETAPA_2':
      return 'Calculando valores iniciales (silencioso)';
    case 'ETAPA_3':
      return 'Preparando examen visual - ajustando foróptero';
    case 'ETAPA_4':
      return 'Test de agudeza visual';
    default:
      return `En etapa ${estadoExamen.etapa}`;
  }
}

