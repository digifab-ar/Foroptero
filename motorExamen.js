/**
 * MOTOR DE EXAMEN VISUAL
 * 
 * State Machine que maneja toda la lógica del examen visual.
 * El agente solo ejecuta pasos, el backend decide TODO.
 * 
 * FASE 1: El backend ejecuta comandos automáticamente (foróptero, TV)
 * y solo retorna pasos de tipo "hablar" al agente.
 */

// Importar funciones de ejecución interna desde server.js
// Nota: Estas funciones se importarán dinámicamente para evitar dependencia circular
let ejecutarComandoForopteroInterno = null;
let ejecutarComandoTVInterno = null;

/**
 * Inicializa las funciones de ejecución interna
 * Se debe llamar desde server.js después de crear las funciones
 */
export function inicializarEjecutores(foropteroFn, tvFn) {
  ejecutarComandoForopteroInterno = foropteroFn;
  ejecutarComandoTVInterno = tvFn;
  console.log('✅ Ejecutores internos inicializados');
}

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
        estadoExamen.ojoActual = estadoExamen.secuenciaExamen.testActual?.ojo || 'R';
        estadoExamen.subEtapa = null;
        console.log('✅ Foróptero configurado, pasando a ETAPA_4');
      }
      return { ok: true };
    
    case 'ETAPA_4':
      // ETAPA_4 se procesa directamente en obtenerInstrucciones() con interpretacionAgudeza
      // Este case no se debería ejecutar, pero por seguridad retornamos ok
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
      return generarPasosEtapa4();
    
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
 * Funciones auxiliares para agudeza visual
 */

/**
 * Baja el valor logMAR al siguiente más pequeño
 */
function bajarLogMAR(logmar) {
  const secuencia = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0];
  const indice = secuencia.indexOf(logmar);
  if (indice > 0) {
    return secuencia[indice - 1];
  }
  return logmar; // Ya está en el mínimo
}

/**
 * Sube el valor logMAR al siguiente más grande
 */
function subirLogMAR(logmar) {
  const secuencia = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 2.0];
  const indice = secuencia.indexOf(logmar);
  if (indice < secuencia.length - 1) {
    return secuencia[indice + 1];
  }
  return logmar; // Ya está en el máximo
}

/**
 * Genera una letra Sloan diferente a las usadas
 */
function generarLetraSloan(letrasUsadas) {
  const letrasSloan = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z'];
  const disponibles = letrasSloan.filter(l => !letrasUsadas.includes(l));
  
  if (disponibles.length === 0) {
    // Si se usaron todas, resetear y elegir una diferente a la última
    const ultima = letrasUsadas[letrasUsadas.length - 1];
    const sinUltima = letrasSloan.filter(l => l !== ultima);
    return sinUltima[Math.floor(Math.random() * sinUltima.length)];
  }
  
  return disponibles[Math.floor(Math.random() * disponibles.length)];
}

/**
 * Procesa respuesta del paciente en test de agudeza visual
 * @param {string} respuestaPaciente - Respuesta del paciente (texto crudo)
 * @param {object} interpretacionAgudeza - Interpretación estructurada del agente
 * @returns {object} - Resultado del procesamiento
 */
function procesarRespuestaAgudeza(respuestaPaciente, interpretacionAgudeza) {
  const estado = estadoExamen.agudezaEstado;
  const testActual = estadoExamen.secuenciaExamen.testActual;
  
  // Validar que estamos en test de agudeza
  if (!testActual || testActual.tipo !== 'agudeza_inicial') {
    return { ok: false, error: 'No estamos en test de agudeza' };
  }
  
  const ojo = testActual.ojo;
  const resultado = interpretacionAgudeza?.resultado || 'no_se';
  
  console.log(`📊 Procesando respuesta agudeza (${ojo}):`, {
    respuestaPaciente,
    resultado,
    logmarActual: estado.logmarActual,
    ultimoLogmarCorrecto: estado.ultimoLogmarCorrecto,
    confirmaciones: estado.confirmaciones
  });
  
  // Procesar según interpretación
  if (resultado === 'correcta') {
    // Letra correcta
    // Verificar si es el mismo logMAR que el último correcto (ANTES de actualizar)
    const esMismoLogMAR = estado.logmarActual === estado.ultimoLogmarCorrecto;
    
    // Actualizar último logMAR correcto
    estado.ultimoLogmarCorrecto = estado.logmarActual;
    estado.mejorLogmar = estado.mejorLogmar === null 
      ? estado.logmarActual 
      : Math.min(estado.mejorLogmar, estado.logmarActual);
    
    // Si es el mismo logMAR que el último correcto, incrementar confirmaciones
    if (esMismoLogMAR && estado.ultimoLogmarCorrecto !== null) {
      estado.confirmaciones += 1;
      
      console.log(`✅ Confirmación ${estado.confirmaciones}/2 en logMAR ${estado.logmarActual}`);
      
      // Si hay 2 confirmaciones, resultado confirmado
      if (estado.confirmaciones >= 2) {
        // Guardar resultado
        estadoExamen.agudezaVisual[ojo] = {
          logmar: estado.logmarActual,
          letra: interpretacionAgudeza.letraIdentificada || estado.letraActual,
          confirmado: true
        };
        
        // Guardar en secuencia
        estadoExamen.secuenciaExamen.resultados[ojo].agudezaInicial = estado.logmarActual;
        
        console.log(`✅ Agudeza confirmada para ${ojo}: logMAR ${estado.logmarActual}`);
        
        // Resetear estado de agudeza para el siguiente test
        estado.ojo = null;
        estado.logmarActual = null;
        estado.letraActual = null;
        estado.mejorLogmar = null;
        estado.ultimoLogmarCorrecto = null;
        estado.letrasUsadas = [];
        estado.intentos = 0;
        estado.confirmaciones = 0;
        
        // Avanzar al siguiente test
        const siguienteTest = avanzarTest();
        
        return { 
          ok: true, 
          resultadoConfirmado: true,
          logmarFinal: estadoExamen.agudezaVisual[ojo].logmar,
          siguienteTest
        };
      }
      
      // Si aún no hay 2 confirmaciones, mostrar otra letra en el mismo logMAR
      const nuevaLetra = generarLetraSloan(estado.letrasUsadas);
      estado.letraActual = nuevaLetra;
      estado.letrasUsadas.push(nuevaLetra);
      
      // NO bajar logMAR, mantener el mismo para confirmar
      return { ok: true, necesitaNuevaLetra: true };
    } else {
      // Nuevo logMAR o primera respuesta correcta, resetear confirmaciones a 1
      estado.confirmaciones = 1;
      
      // Bajar logMAR (si no está en 0.0)
      if (estado.logmarActual > 0.0) {
        estado.logmarActual = bajarLogMAR(estado.logmarActual);
      }
      
      // Generar nueva letra
      const nuevaLetra = generarLetraSloan(estado.letrasUsadas);
      estado.letraActual = nuevaLetra;
      estado.letrasUsadas.push(nuevaLetra);
    }
    
  } else {
    // Respuesta incorrecta, borroso, no ve, etc.
    
    if (estado.ultimoLogmarCorrecto !== null) {
      // Volver al último correcto
      estado.logmarActual = estado.ultimoLogmarCorrecto;
      // Resetear confirmaciones porque estamos empezando a confirmar de nuevo este logMAR
      estado.confirmaciones = 0;
      
      // Generar nueva letra
      const nuevaLetra = generarLetraSloan(estado.letrasUsadas);
      estado.letraActual = nuevaLetra;
      estado.letrasUsadas.push(nuevaLetra);
      
    } else {
      // Primera respuesta, subir logMAR
      estado.logmarActual = subirLogMAR(estado.logmarActual);
      
      // Generar nueva letra
      const nuevaLetra = generarLetraSloan(estado.letrasUsadas);
      estado.letraActual = nuevaLetra;
      estado.letrasUsadas.push(nuevaLetra);
    }
  }
  
  estado.intentos += 1;
  
  return { ok: true, necesitaNuevaLetra: true };
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
 * Genera pasos para ETAPA_4 (test de agudeza visual)
 */
function generarPasosEtapa4() {
  const testActual = estadoExamen.secuenciaExamen.testActual;
  
  // Validar que estamos en test de agudeza
  if (!testActual || testActual.tipo !== 'agudeza_inicial') {
    return {
      ok: false,
      error: 'No estamos en test de agudeza visual'
    };
  }
  
  const ojo = testActual.ojo;
  const estado = estadoExamen.agudezaEstado;
  
  // Inicializar estado de agudeza si es la primera vez
  if (estado.ojo !== ojo || estado.logmarActual === null) {
    estado.ojo = ojo;
    estado.logmarActual = 0.4; // Inicio con logMAR 0.4
    estado.letraActual = 'H'; // Primera letra siempre 'H'
    estado.mejorLogmar = null;
    estado.ultimoLogmarCorrecto = null;
    estado.letrasUsadas = ['H'];
    estado.intentos = 0;
    estado.confirmaciones = 0;
    
    console.log(`🔍 Iniciando test de agudeza visual para ${ojo}`);
  }
  
  // Si el resultado ya está confirmado, avanzar al siguiente test
  if (estadoExamen.agudezaVisual[ojo]?.confirmado) {
    const siguienteTest = avanzarTest();
    if (siguienteTest) {
      // Cambiar a la etapa del siguiente test
      if (siguienteTest.tipo === 'agudeza_inicial') {
        // Siguiente test también es agudeza (otro ojo)
        return generarPasosEtapa4();
      } else {
        // Siguiente test es de lentes, cambiar a ETAPA_5
        estadoExamen.etapa = 'ETAPA_5';
        return generarPasos(); // Generar pasos de la nueva etapa
      }
    } else {
      // Examen completado
      estadoExamen.etapa = 'FINALIZADO';
      return {
        ok: true,
        pasos: [
          {
            tipo: 'hablar',
            orden: 1,
            mensaje: 'Perfecto, hemos completado el examen visual.'
          }
        ]
      };
    }
  }
  
  // Generar pasos: TV + Hablar
  const pasos = [
    {
      tipo: 'tv',
      orden: 1,
      letra: estado.letraActual,
      logmar: estado.logmarActual
    },
    {
      tipo: 'hablar',
      orden: 2,
      mensaje: 'Mirá la pantalla. Decime qué letra ves.'
    }
  ];
  
  return {
    ok: true,
    pasos,
    contexto: {
      etapa: 'ETAPA_4',
      testActual,
      agudezaEstado: {
        logmarActual: estado.logmarActual,
        letraActual: estado.letraActual,
        mejorLogmar: estado.mejorLogmar,
        ultimoLogmarCorrecto: estado.ultimoLogmarCorrecto,
        confirmaciones: estado.confirmaciones
      }
    }
  };
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
 * Ejecuta pasos automáticamente (foróptero, TV, esperar)
 * Solo ejecuta pasos que no son de tipo "hablar"
 * @param {Array} pasos - Array de pasos a ejecutar
 * @returns {Promise<object>} - Resultado de la ejecución
 */
async function ejecutarPasosAutomaticamente(pasos) {
  if (!pasos || pasos.length === 0) {
    return { ok: true, ejecutados: [] };
  }
  
  const pasosAEjecutar = pasos.filter(p => 
    p.tipo === 'foroptero' || p.tipo === 'tv' || p.tipo === 'esperar'
  );
  
  if (pasosAEjecutar.length === 0) {
    return { ok: true, ejecutados: [] };
  }
  
  const ejecutados = [];
  const errores = [];
  
  console.log(`🔧 Ejecutando ${pasosAEjecutar.length} pasos automáticamente...`);
  
  for (const paso of pasosAEjecutar) {
    try {
      if (paso.tipo === 'foroptero') {
        if (!ejecutarComandoForopteroInterno) {
          console.warn('⚠️ ejecutarComandoForopteroInterno no inicializado');
          continue;
        }
        const resultado = await ejecutarComandoForopteroInterno(paso.foroptero);
        ejecutados.push({ tipo: 'foroptero', resultado });
        console.log('✅ Comando foróptero ejecutado:', resultado);
        
        // Esperar un momento después de ejecutar foróptero (para que el dispositivo procese)
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } else if (paso.tipo === 'tv') {
        if (!ejecutarComandoTVInterno) {
          console.warn('⚠️ ejecutarComandoTVInterno no inicializado');
          continue;
        }
        const resultado = await ejecutarComandoTVInterno({
          letra: paso.letra,
          logmar: paso.logmar
        });
        ejecutados.push({ tipo: 'tv', resultado });
        console.log('✅ Comando TV ejecutado:', resultado);
        
        // Esperar un momento después de ejecutar TV
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } else if (paso.tipo === 'esperar') {
        const segundos = paso.esperarSegundos || 0;
        console.log(`⏳ Esperando ${segundos} segundos...`);
        await new Promise(resolve => setTimeout(resolve, segundos * 1000));
        ejecutados.push({ tipo: 'esperar', segundos });
      }
    } catch (error) {
      console.error(`❌ Error ejecutando paso ${paso.tipo}:`, error);
      errores.push({ tipo: paso.tipo, error: error.message });
      // Continuar con el siguiente paso aunque haya error
    }
  }
  
  return {
    ok: errores.length === 0,
    ejecutados,
    errores: errores.length > 0 ? errores : undefined
  };
}

/**
 * Obtiene instrucciones (pasos) para el agente
 * Si hay respuestaPaciente, la procesa primero
 * Ejecuta automáticamente los comandos de dispositivos (foróptero, TV)
 * y solo retorna pasos de tipo "hablar" al agente
 * @param {string|null} respuestaPaciente - Respuesta del paciente
 * @param {object|null} interpretacionAgudeza - Interpretación estructurada del agente (para ETAPA_4)
 */
export async function obtenerInstrucciones(respuestaPaciente = null, interpretacionAgudeza = null) {
  // Si hay respuesta del paciente, procesarla primero
  if (respuestaPaciente) {
    // Si estamos en ETAPA_4 y hay interpretación, usar procesarRespuestaAgudeza directamente
    if (estadoExamen.etapa === 'ETAPA_4' && interpretacionAgudeza) {
      const resultado = procesarRespuestaAgudeza(respuestaPaciente, interpretacionAgudeza);
      
      if (!resultado.ok) {
        return {
          ok: false,
          error: resultado.error || 'Error procesando respuesta de agudeza'
        };
      }
      
      // Si se confirmó el resultado, generar pasos del siguiente test
      if (resultado.resultadoConfirmado) {
        // Generar pasos del siguiente test
        const pasos = generarPasos();
        
        // Ejecutar pasos automáticamente
        await ejecutarPasosAutomaticamente(pasos.pasos || []);
        
        // Filtrar: solo retornar pasos de tipo "hablar"
        const pasosParaAgente = (pasos.pasos || []).filter(p => p.tipo === 'hablar');
        
        return {
          ok: true,
          pasos: pasosParaAgente,
          contexto: pasos.contexto || {
            etapa: estadoExamen.etapa,
            testActual: estadoExamen.secuenciaExamen.testActual
          }
        };
      }
      
      // Si necesita nueva letra, generar pasos
      if (resultado.necesitaNuevaLetra) {
        const pasos = generarPasosEtapa4();
        
        // Ejecutar pasos automáticamente
        await ejecutarPasosAutomaticamente(pasos.pasos || []);
        
        // Filtrar: solo retornar pasos de tipo "hablar"
        const pasosParaAgente = (pasos.pasos || []).filter(p => p.tipo === 'hablar');
        
        return {
          ok: true,
          pasos: pasosParaAgente,
          contexto: pasos.contexto || {
            etapa: estadoExamen.etapa,
            testActual: estadoExamen.secuenciaExamen.testActual
          }
        };
      }
    }
    
    // Procesamiento normal para otras etapas
    const resultado = procesarRespuesta(respuestaPaciente);
    
    if (!resultado.ok) {
      return {
        ok: false,
        error: resultado.error || 'Error procesando respuesta'
      };
    }
    
    // Si el procesamiento generó pasos (ej: error de validación), retornarlos
    if (resultado.pasos) {
      // Ejecutar pasos automáticamente (aunque en este caso solo deberían ser "hablar")
      await ejecutarPasosAutomaticamente(resultado.pasos);
      
      // Filtrar: solo retornar pasos de tipo "hablar"
      const pasosParaAgente = resultado.pasos.filter(p => p.tipo === 'hablar');
      
      return {
        ok: true,
        pasos: pasosParaAgente,
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
      // Ejecutar pasos automáticamente antes de retornar
      await ejecutarPasosAutomaticamente(nuevosPasos.pasos || []);
      
      // Filtrar: solo retornar pasos de tipo "hablar" al agente
      const pasosParaAgente = (nuevosPasos.pasos || []).filter(p => p.tipo === 'hablar');
      
      return {
        ok: true,
        pasos: pasosParaAgente,
        contexto: nuevosPasos.contexto || {
          etapa: estadoExamen.etapa,
          subEtapa: estadoExamen.subEtapa
        }
      };
    }
  }
  
  // Ejecutar pasos automáticamente (foróptero, TV, esperar)
  await ejecutarPasosAutomaticamente(pasos.pasos || []);
  
  // Filtrar: solo retornar pasos de tipo "hablar" al agente
  const pasosParaAgente = (pasos.pasos || []).filter(p => p.tipo === 'hablar');
  
  return {
    ok: true,
    pasos: pasosParaAgente,
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

