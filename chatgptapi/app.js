const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
require('dotenv').config();

const serviceAccount = require('./firebaseadminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
app.use(cors());
app.use(express.json());

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
});









// const express = require('express');
// const cors = require('cors');
// const admin = require('firebase-admin');
// require('dotenv').config();


// const serviceAccount = require('./firebaseadminsdk.json');


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

// const app = express();
// app.use(cors());
// app.use(express.json());


// app.post('/generar-recomendacion', async (req, res) => {
//   try {
//     const { presupuesto, tipoCocina, preferencia } = req.body;

//     if (!presupuesto || !preferencia) {
//       return res.status(400).json({ error: 'Parámetros requeridos: presupuesto y preferencia' });
//     }

//     const db = admin.firestore();
//     const referenciaCarta = db.collection('cartasnegocio');
//     const referenciaNegocio = db.collection('negocios');
//     const referenciaTipoCocina = db.collection('tipococina');

//     const cartasSnapshot = await referenciaCarta.get();
//     let recomendaciones = [];
//     let presupuestoRestante = presupuesto;

//     for (const doc of cartasSnapshot.docs) {
//       const datosCarta = doc.data();
//       const itemsCarta = datosCarta.carta;

//       if (!itemsCarta || itemsCarta.length === 0) {
//         continue;
//       }

//       const idNegocio = datosCarta.negocioId;
//       if (!idNegocio) {
//         continue;
//       }

//       const negocioSnapshot = await referenciaNegocio.doc(idNegocio).get();
//       if (!negocioSnapshot.exists) {
//         continue;
//       }

//       const datosNegocio = negocioSnapshot.data();
//       const idTipoCocina = datosNegocio.tipo_cocina;


//       if (tipoCocina.toLowerCase() !== "cualquiera") {
//         if (!idTipoCocina) continue;

//         const tipoCocinaSnapshot = await referenciaTipoCocina.doc(idTipoCocina).get();
//         if (!tipoCocinaSnapshot.exists) {
//           continue;
//         }

//         const nombreTipoCocina = tipoCocinaSnapshot.data().nombre;
//         if (nombreTipoCocina.toLowerCase() !== tipoCocina.toLowerCase()) {
//           continue;
//         }
//       }


//       for (const item of itemsCarta) {
//         if (
//           (item.nombre.toLowerCase().includes(preferencia.toLowerCase()) ||
//             item.descripcion.toLowerCase().includes(preferencia.toLowerCase())) &&
//           item.precio <= presupuestoRestante
//         ) {
//           recomendaciones.push({
//             nombreItem: item.nombre,
//             descripcion: item.descripcion,
//             precio: item.precio,
//             negocio: datosNegocio.nombre,
//           });
//           presupuestoRestante -= item.precio;

          
//           if (presupuestoRestante <= 0) {
//             break;
//           }
//         }
//       }

      
//       if (presupuestoRestante <= 0) {
//         break;
//       }
//     }

//     if (recomendaciones.length === 0) {
//       return res.json({
//         recomendacion: `Lamentablemente, no pude encontrar ningún plato que se ajuste a tu presupuesto de ${presupuesto} soles. Tal vez podrías considerar ajustar tu presupuesto o preferencias para encontrar una recomendación más adecuada.`,
//       });
//     }

//     res.json({
//       recomendaciones,
//       presupuestoRestante,
//     });
//   } catch (error) {
//     console.error('Error en la generación de recomendación:', error);
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// });



// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en puerto ${PORT}`);
// });






//api con gpt incluido
// const express = require('express');
// const cors = require('cors');
// const OpenAI = require('openai');
// const admin = require('firebase-admin');
// require('dotenv').config();

// // Cargar credenciales de Firebase desde el archivo JSON
// const serviceAccount = require('./firebaseadminsdk.json');

// // Configuración de OpenAI
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });


// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });

// const app = express();
// app.use(cors());
// app.use(express.json());


// app.post('/generar-recomendacion', async (req, res) => {
//   try {
//     const { presupuesto, tipoCocina, preferencia } = req.body;

//     if (!presupuesto || !preferencia) {
//       return res.status(400).json({ error: 'Parámetros requeridos: presupuesto y preferencia' });
//     }


//     const chatCompletion = await openai.chat.completions.create({
//       messages: [
//         {
//           role: 'system',
//           content:
//             'Eres un asistente culinario. Tienes acceso a platos de un restaurante con nombre, descripción y precio. Procesa las solicitudes de los usuarios para recomendar qué platos pueden comprar con su presupuesto y preferencias.',
//         },
//         {
//           role: 'user',
//           content: `Tengo un presupuesto de ${presupuesto} soles. Mi preferencia es: "${preferencia}". Por favor, analiza y devuélveme lo que necesito buscar.`,
//         },
//       ],
//       model: 'gpt-3.5-turbo',
//     });


//     const gptResponse = chatCompletion.choices[0].message.content;

//     // Paso 2: Interpretar la respuesta y usarla en las consultas de Firestore
//     const db = admin.firestore();
//     const referenciaCarta = db.collection('cartasnegocio');
//     const referenciaNegocio = db.collection('negocios');
//     const referenciaTipoCocina = db.collection('tipococina');

//     const cartasSnapshot = await referenciaCarta.get();
//     let recomendaciones = [];
//     let presupuestoRestante = presupuesto;

//     for (const doc of cartasSnapshot.docs) {
//       const datosCarta = doc.data();
//       const itemsCarta = datosCarta.carta;

//       if (!itemsCarta || itemsCarta.length === 0) {
//         continue;
//       }

//       const idNegocio = datosCarta.negocioId;
//       if (!idNegocio) {
//         continue;
//       }

//       const negocioSnapshot = await referenciaNegocio.doc(idNegocio).get();
//       if (!negocioSnapshot.exists) {
//         continue;
//       }

//       const datosNegocio = negocioSnapshot.data();
//       const idTipoCocina = datosNegocio.tipo_cocina;


//       if (tipoCocina.toLowerCase() !== 'cualquiera') {
//         if (!idTipoCocina) continue;

//         const tipoCocinaSnapshot = await referenciaTipoCocina.doc(idTipoCocina).get();
//         if (!tipoCocinaSnapshot.exists) {
//           continue;
//         }

//         const nombreTipoCocina = tipoCocinaSnapshot.data().nombre;
//         if (nombreTipoCocina.toLowerCase() !== tipoCocina.toLowerCase()) {
//           continue;
//         }
//       }


//       for (const item of itemsCarta) {
//         if (
//           (item.nombre.toLowerCase().includes(gptResponse.toLowerCase()) ||
//             item.descripcion.toLowerCase().includes(gptResponse.toLowerCase())) &&
//           item.precio <= presupuestoRestante
//         ) {
//           recomendaciones.push({
//             nombreItem: item.nombre,
//             descripcion: item.descripcion,
//             precio: item.precio,
//             negocio: datosNegocio.nombre,
//           });
//           presupuestoRestante -= item.precio;

//           // Si no queda presupuesto para más elementos, detener la búsqueda
//           if (presupuestoRestante <= 0) {
//             break;
//           }
//         }
//       }

//       // Si no queda presupuesto para más elementos, detener la búsqueda
//       if (presupuestoRestante <= 0) {
//         break;
//       }
//     }

//     if (recomendaciones.length === 0) {
//       return res.json({
//         recomendacion: `Lamentablemente, no pude encontrar ningún plato que se ajuste a tu presupuesto de ${presupuesto} soles. Tal vez podrías considerar ajustar tu presupuesto o preferencias para encontrar una recomendación más adecuada.`,
//       });
//     }

//     res.json({
//       gptAnalisis: gptResponse,
//       recomendaciones,
//       presupuestoRestante,
//     });
//   } catch (error) {
//     console.error('Error en la generación de recomendación:', error);
//     res.status(500).json({ error: 'Error interno del servidor' });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en puerto ${PORT}`);
// });
