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
      // Etapa 2 es silenciosa, no procesa respuestas
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
    // Ya se procesaron los valores, generar pasos de confirmación
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
 * Genera pasos para ETAPA_2 (cálculo silencioso)
 * Esta etapa no genera pasos visibles, solo procesa internamente
 */
function generarPasosEtapa2() {
  // Aplicar recálculo cilíndrico (se implementará en Fase 2)
  // Por ahora, solo copiamos los valores
  estadoExamen.valoresRecalculados = {
    R: { ...estadoExamen.valoresIniciales.R },
    L: { ...estadoExamen.valoresIniciales.L }
  };
  
  // Pasar a ETAPA_3
  estadoExamen.etapa = 'ETAPA_3';
  
  console.log('✅ Valores recalculados (placeholder):', estadoExamen.valoresRecalculados);
  
  // Generar pasos para ETAPA_3 (se implementará en Fase 2)
  // Por ahora, retornar pasos vacíos (sin mensaje)
  return {
    ok: true,
    pasos: [
      {
        tipo: 'hablar',
        orden: 1,
        mensaje: 'Preparando el examen...'
      }
    ]
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
      return 'Calculando valores iniciales';
    case 'ETAPA_3':
      return 'Preparando examen visual';
    default:
      return `En etapa ${estadoExamen.etapa}`;
  }
}

