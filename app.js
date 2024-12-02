const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

// Inicializar Firebase usando variables de entorno
admin.initializeApp({
  credential: admin.credential.cert({
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  }),
});

const app = express();
app.use(cors());
app.use(express.json());

// Ruta de Health Check
app.get('/', (req, res) => {
  res.status(200).send('API funcionando correctamente.');
});

app.post('/generar-recomendacion', async (req, res) => {
  try {
    const { presupuesto, tipoCocina, preferencia, estado } = req.body;

    if (!presupuesto || !preferencia) {
      return res.status(400).json({ error: 'Parámetros requeridos: presupuesto y preferencia' });
    }

    const db = admin.firestore();
    const referenciaCarta = db.collection('cartasnegocio');
    const referenciaNegocio = db.collection('negocios');
    const referenciaTipoCocina = db.collection('tipococina');

    const cartasSnapshot = await referenciaCarta.get();
    let recomendaciones = [];
    let presupuestoRestante = presupuesto;

    for (const doc of cartasSnapshot.docs) {
      const datosCarta = doc.data();
      const itemsCarta = datosCarta.carta;

      if (!itemsCarta || itemsCarta.length === 0) {
        continue;
      }

      const idNegocio = datosCarta.negocioId;
      if (!idNegocio) {
        continue;
      }

      const negocioSnapshot = await referenciaNegocio.doc(idNegocio).get();
      if (!negocioSnapshot.exists) {
        continue;
      }

      const datosNegocio = negocioSnapshot.data();
      const idTipoCocina = datosNegocio.tipo_cocina;

      if (tipoCocina.toLowerCase() !== 'cualquiera') {
        if (!idTipoCocina) continue;

        const tipoCocinaSnapshot = await referenciaTipoCocina.doc(idTipoCocina).get();
        if (!tipoCocinaSnapshot.exists) {
          continue;
        }

        const nombreTipoCocina = tipoCocinaSnapshot.data().nombre;
        if (nombreTipoCocina.toLowerCase() !== tipoCocina.toLowerCase()) {
          continue;
        }
      }

      for (const item of itemsCarta) {
        const estadoValido = !estado || (item.estado && item.estado.toLowerCase() === estado.toLowerCase());

        if (
          estadoValido &&
          (item.nombre.toLowerCase().includes(preferencia.toLowerCase()) ||
            item.descripcion.toLowerCase().includes(preferencia.toLowerCase())) &&
          item.precio <= presupuestoRestante
        ) {
          recomendaciones.push({
            nombreItem: item.nombre,
            descripcion: item.descripcion,
            precio: item.precio,
            estado: item.estado || 'Sin estado',
            negocio: datosNegocio.nombre,
          });
          presupuestoRestante -= item.precio;

          if (presupuestoRestante <= 0) {
            break;
          }
        }
      }

      if (presupuestoRestante <= 0) {
        break;
      }
    }

    if (recomendaciones.length === 0) {
      return res.json({
        recomendacion: `Lamentablemente, no pude encontrar ningún plato que se ajuste a tu presupuesto de ${presupuesto} soles. Tal vez podrías considerar ajustar tu presupuesto o preferencias para encontrar una recomendación más adecuada.`,
      });
    }

    res.json({
      recomendaciones,
      presupuestoRestante,
    });
  } catch (error) {
    console.error('Error en la generación de recomendación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
}).on('error', (err) => {
  console.error('Error al iniciar el servidor:', err);
});
