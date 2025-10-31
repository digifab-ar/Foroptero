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

// Tópicos específicos del foróptero
const MQTT_TOPIC_CMD = "foroptero01/cmd";      // comandos al ESP32
const MQTT_TOPIC_STATE = "foroptero01/state";  // estado publicado por el ESP32

// Token de autenticación simple
const TOKEN_ESPERADO = "foropteroiñaki2022#";

// Estado local (último recibido del ESP32)
let ultimoEstado = { status: "ready" };

// ============================================================
// CONEXIÓN MQTT
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
// ENDPOINT: /api/movimiento
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

  // --- Construir comando MQTT ---
  const comando = {
    accion,
    ...(R && { R }),
    ...(L && { L }),
    token
  };

  // --- Publicar comando ---
  mqttClient.publish(MQTT_TOPIC_CMD, JSON.stringify(comando));
  console.log("Comando publicado en MQTT:", comando);

  // --- Respuesta inmediata al cliente ---
  const timestamp = Math.floor(Date.now() / 1000);
  res.json({ status: "busy", timestamp });
});

// ============================================================
// ENDPOINT: /api/estado
// ============================================================
app.get("/api/estado", (req, res) => {
  res.json(ultimoEstado);
});

// ============================================================
// SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`Backend Foróptero corriendo en puerto ${PORT}`);
  console.log(`Publica comandos en → ${MQTT_TOPIC_CMD}`);
  console.log(`Escucha estados en → ${MQTT_TOPIC_STATE}`);
});
