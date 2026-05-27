import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = "gpt-5.4-mini";

// Historial de conversación en memoria
let conversationHistory = [];

app.post("/resolver", upload.single("imagen"), async (req, res) => {
  try {
    const { problema } = req.body;
    const imagen = req.file;

    // Guardar mensaje del usuario
    if (problema) {
      conversationHistory.push({ role: "user", content: problema });
    }

    // Si hay imagen, convertirla a base64 y añadirla
    if (imagen) {
      const base64Image = fs.readFileSync(imagen.path, { encoding: "base64" });
      conversationHistory.push({
        role: "user",
        content: [
          { type: "text", text: "También analiza esta imagen relacionada:" },
          { type: "image_url", image_url: { url: `data:image/png;base64,${base64Image}` } }
        ]
      });
    }

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: "Eres un experto en cálculo universitario. Explica en español, con pasos numerados claros, y si es útil haz preguntas para continuar el flujo." },
        ...conversationHistory
      ]
    });

    const respuesta = completion.choices?.[0]?.message?.content || "No se pudo generar respuesta.";

    // Guardar respuesta del asistente en el historial
    conversationHistory.push({ role: "assistant", content: respuesta });

    res.json({ respuesta });
  } catch (error) {
    console.error("Error con OpenAI:", error);
    res.json({ respuesta: "Error al procesar con OpenAI." });
  }
});

// 🚀 Aquí está la corrección: usar process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
