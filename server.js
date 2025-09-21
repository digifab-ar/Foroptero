import express from 'express';
import mqtt from 'mqtt';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Conectar al broker MQTT
const mqttClient = mqtt.connect('mqtt://broker.hivemq.com');
const topic = 'esp32/accion';

mqttClient.on('connect', () => {
  console.log('Conectado al broker MQTT');
});

// Endpoint para recibir comando desde ChatGPT
app.post('/api/comando', (req, res) => {
  const { accion, token } = req.body;

  if (!accion || !token) {
    return res.status(400).json({ error: 'Faltan campos' });
  }

  if (token !== 'mi-token-secreto') {
    return res.status(403).json({ error: 'Token inválido' });
  }

  const payload = JSON.stringify({ accion, token });
  mqttClient.publish(topic, payload, () => {
    console.log(`Publicado: ${payload}`);
    return res.status(200).json({ status: 'Comando enviado al ESP32' });
  });
});

// Puerto para Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
