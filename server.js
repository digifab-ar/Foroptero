import express from "express";
import mqtt from "mqtt";
import cors from "cors";

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================
const app = express();
app.use(cors({
  origin: "*", // 🔓 permite acceso desde cualquier dominio (Framer incluido)
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());


const PORT = process.env.PORT || 3000;
const MQTT_SERVER = "mqtt://broker.hivemq.com";

// Tópicos específicos del foróptero
const MQTT_TOPIC_CMD = "foroptero01/cmd";      // comandos al ESP32
const MQTT_TOPIC_STATE = "foroptero01/state";  // estado publicado por el ESP32

// Token de autenticación simple
const TOKEN_ESPERADO = "foropteroiñaki2022#";

// ============================================================
// ESTADO LOCAL (FORÓPTERO)
// ============================================================
let ultimoEstado = { status: "ready" };

// ============================================================
// ESTADO LOCAL (PANTALLA)
// ============================================================
let estadoPantalla = {
  letra: null,
  logmar: null,
  timestamp: null
};

// ============================================================
// CONEXIÓN MQTT (FORÓPTERO)
// ============================================================
const mqttClient = mqtt.connect(MQTT_SERVER);

mqttClient.on("connect", () => {
  console.log("Conectado al broker MQTT");
  mqttClient.subscribe(MQTT_TOPIC_STATE);
});

mqttClient.on("message", (topic, message) => {
  if (topic === MQTT_TOPIC_STATE) {
    try {
      const estado = JSON.parse(message.toString());
      ultimoEstado = estado;
      console.log("Estado recibido:", estado);
    } catch (err) {
      console.log("Error al parsear mensaje MQTT:", err.message);
    }
  }
});

// ============================================================
// BLOQUE: ENDPOINTS FORÓPTERO
// ============================================================
app.post("/api/movimiento", (req, res) => {
  const { accion, R, L, token } = req.body;
  
  // --- Validaciones básicas ---
  if (!accion || accion !== "movimiento")
    return res.status(400).json({ error: "Acción inválida" });

  if (token !== TOKEN_ESPERADO)
    return res.status(403).json({ error: "Token inválido" });

  if (!R && !L)
    return res.status(400).json({ error: "Debe incluir al menos R o L" });

  // --- Construir comando MQTT con timestamp ---
  const comando = {
    dispositivo: "foroptero",
    accion,
    ...(R && { R }),
    ...(L && { L }),
    token,
    timestamp: Math.floor(Date.now() / 1000)
  };
  
  // --- Publicar comando en MQTT ---
  mqttClient.publish(MQTT_TOPIC_CMD, JSON.stringify(comando));
  console.log("Comando publicado en MQTT:", comando);
  
  // --- Respuesta inmediata al cliente ---
  res.json({ status: "busy", timestamp: comando.timestamp });
});

// ============================================================
// ENDPOINT: /api/estado
// ============================================================

app.get("/api/estado", (req, res) => {
  res.json(ultimoEstado);
});

// ============================================================
// BLOQUE: ENDPOINTS PANTALLA (SIN STREAM)
// ============================================================

// POST /api/pantalla → mostrar letra y logMAR
app.post("/api/pantalla", (req, res) => {
  const { dispositivo, accion, letra, logmar, token } = req.body;

  // --- Validaciones ---
  if (dispositivo !== "pantalla")
    return res.status(400).json({ error: "Dispositivo inválido o faltante" });

  if (accion !== "mostrar")
    return res.status(400).json({ error: "Acción inválida (solo 'mostrar')" });

  if (token !== TOKEN_ESPERADO)
    return res.status(403).json({ error: "Token inválido" });

  if (!letra || typeof logmar !== "number")
    return res.status(400).json({ error: "Faltan campos 'letra' o 'logmar'" });

  // --- Actualizar estado local ---
  estadoPantalla = {
    letra,
    logmar,
    timestamp: Math.floor(Date.now() / 1000)
  };

  console.log("🖥️ Pantalla actualizada:", estadoPantalla);
  res.json({ status: "ok", ...estadoPantalla });
});

// GET /api/pantalla → obtener el estado actual
app.get("/api/pantalla", (req, res) => {
  res.json(estadoPantalla);
});

// ============================================================
// SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`Backend Foróptero corriendo en puerto ${PORT}`);
  console.log(`Publica comandos en → ${MQTT_TOPIC_CMD}`);
  console.log(`Escucha estados en → ${MQTT_TOPIC_STATE}`);
  console.log(`Sirve pantalla en → /api/pantalla`);
});
