import express from "express";
import mqtt from "mqtt";
import cors from "cors";

// ============================================================
// CONFIGURACIÓN GENERAL
// ============================================================
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Broker MQTT público HiveMQ
const MQTT_SERVER = "mqtt://broker.hivemq.com";

// Tópicos específicos
const MQTT_TOPIC_CMD = "foroptero01/cmd";       // comandos al ESP32
const MQTT_TOPIC_STATE = "foroptero01/state";   // estado publicado por el ESP32
const MQTT_TOPIC_PANTALLA = "foroptero01/pantalla"; // comandos a la pantalla

// Token interno (no se expone en las llamadas del GPT)
const TOKEN_ESPERADO = "foropteroiñaki2022#";

// Estado local
let ultimoEstado = { status: "ready" };
let estadoPantalla = { letra: null, logmar: null, timestamp: null };

// ============================================================
// CONEXIÓN MQTT
// ============================================================
const mqttClient = mqtt.connect(MQTT_SERVER);

mqttClient.on("connect", () => {
  console.log("✅ Conectado al broker MQTT");
  mqttClient.subscribe(MQTT_TOPIC_STATE);
  mqttClient.subscribe(MQTT_TOPIC_PANTALLA);
});

mqttClient.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    if (topic === MQTT_TOPIC_STATE) {
      ultimoEstado = data;
      console.log("📡 Estado foróptero recibido:", data);
    } else if (topic === MQTT_TOPIC_PANTALLA) {
      estadoPantalla = data;
      console.log("📺 Estado pantalla recibido:", data);
    }
  } catch (err) {
    console.error("⚠️ Error al parsear mensaje MQTT:", err.message);
  }
});

// ============================================================
// ENDPOINT: /api/movimiento (sin token público)
// Acepta acciones: "movimiento" y "home"
// ============================================================
app.post("/api/movimiento", (req, res) => {
  const { accion, R, L } = req.body;

  // --- Validaciones básicas ---
  if (!accion || (accion !== "movimiento" && accion !== "home"))
    return res.status(400).json({ error: "Acción inválida. Debe ser 'movimiento' o 'home'" });

  if (!R && !L)
    return res.status(400).json({ error: "Debe incluir al menos R o L" });

  // --- Construir comando con token interno ---
  const comando = {
    accion,
    ...(R && { R }),
    ...(L && { L }),
    token: TOKEN_ESPERADO,
    timestamp: Math.floor(Date.now() / 1000)
  };

  mqttClient.publish(MQTT_TOPIC_CMD, JSON.stringify(comando));
  console.log("📤 Comando MQTT → foróptero:", comando);

  res.json({ status: "busy", timestamp: comando.timestamp });
});

// ============================================================
// ENDPOINT: /api/estado
// ============================================================
app.get("/api/estado", (req, res) => {
  res.json(ultimoEstado);
});

// ============================================================
// ENDPOINT: /api/pantalla (sin token público)
// ============================================================
app.post("/api/pantalla", (req, res) => {
  const { dispositivo, accion, letra, logmar } = req.body;

  if (dispositivo !== "pantalla" || accion !== "mostrar")
    return res.status(400).json({ error: "Acción o dispositivo inválido" });

  const comandoPantalla = {
    dispositivo,
    accion,
    letra,
    logmar,
    token: TOKEN_ESPERADO,
    timestamp: Math.floor(Date.now() / 1000)
  };

  mqttClient.publish(MQTT_TOPIC_PANTALLA, JSON.stringify(comandoPantalla));
  console.log("📤 Comando MQTT → pantalla:", comandoPantalla);

  estadoPantalla = {
    letra,
    logmar,
    timestamp: comandoPantalla.timestamp
  };

  res.json({
    status: "ok",
    letra,
    logmar,
    timestamp: comandoPantalla.timestamp
  });
});

// ============================================================
// ENDPOINT: /api/pantalla (GET)
// ============================================================
app.get("/api/pantalla", (req, res) => {
  res.json(estadoPantalla);
});

// ============================================================
// SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 Backend Foróptero corriendo en puerto ${PORT}`);
  console.log(`MQTT CMD → ${MQTT_TOPIC_CMD}`);
  console.log(`MQTT STATE → ${MQTT_TOPIC_STATE}`);
  console.log(`MQTT PANTALLA → ${MQTT_TOPIC_PANTALLA}`);
});
``
