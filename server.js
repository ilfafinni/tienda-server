const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3001;
const IS_VERCEL = !!process.env.VERCEL;
const DB_FILE = IS_VERCEL ? "/tmp/store.db.json" : path.join(__dirname, "store.db.json");

// Cargar o crear base de datos JSON
let db = { zones: [], products: [], scans: [] };

function loadDB() {
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Error cargando DB:", e.message);
    db = { zones: [], products: [], scans: [] };
  }
  if (!db.zones) db.zones = [];
  if (!db.products) db.products = [];
  if (!db.scans) db.scans = [];
}

function saveDB() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Error guardando DB:", e.message);
  }
}

function seed() {
  if (db.zones.length === 0) {
    db.zones = [
      { id: 1, name: "Entrada", type: "entrada", x: 0, y: 0, w: 100, h: 60, color: "#e5e7eb", floor: 1 },
      { id: 2, name: "Floorstand A", type: "floorstand", x: 120, y: 80, w: 140, h: 120, color: "#3b82f6", floor: 1 },
      { id: 3, name: "Mesa Centro", type: "mesa", x: 300, y: 100, w: 160, h: 100, color: "#10b981", floor: 1 },
      { id: 4, name: "Pared Norte", type: "pared", x: 100, y: 0, w: 500, h: 60, color: "#6366f1", floor: 1 },
      { id: 5, name: "Pared Sur", type: "pared", x: 100, y: 540, w: 500, h: 60, color: "#6366f1", floor: 1 },
      { id: 6, name: "Estante Poleras", type: "estante", x: 320, y: 260, w: 120, h: 140, color: "#8b5cf6", floor: 1 },
      { id: 7, name: "Estante Pantalones", type: "estante", x: 80, y: 260, w: 120, h: 140, color: "#ef4444", floor: 1 },
    ];
  }
  if (db.products.length === 0) {
    db.products = [
      { id: 1, code: "PNT-001", name: "Pantalón jean azul", category: "pantalon", size: "M", color: "azul", price: 12990, zone_id: 7, shelf_position: "fila 1" },
      { id: 2, code: "PNT-002", name: "Pantalón jean negro", category: "pantalon", size: "L", color: "negro", price: 13990, zone_id: 7, shelf_position: "fila 2" },
      { id: 3, code: "PNT-003", name: "Pantalón chino caqui", category: "pantalon", size: "M", color: "caqui", price: 10990, zone_id: 7, shelf_position: "fila 1" },
      { id: 4, code: "POL-001", name: "Polera básica blanca", category: "polera", size: "M", color: "blanco", price: 5990, zone_id: 6, shelf_position: "columna A" },
      { id: 5, code: "POL-002", name: "Polera básica negra", category: "polera", size: "L", color: "negro", price: 5990, zone_id: 6, shelf_position: "columna B" },
      { id: 6, code: "POL-003", name: "Polera deportiva roja", category: "polera", size: "S", color: "roja", price: 7990, zone_id: 6, shelf_position: "columna A" },
      { id: 7, code: "ZAP-001", name: "Zapato urbano gris", category: "zapato", size: "42", color: "gris", price: 18990, zone_id: 3, shelf_position: "cajón 1" },
    ];
  }
  saveDB();
}

loadDB();
seed();

// Helper: enviar JSON
function sendJSON(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

// Helper: leer body
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
    req.on("error", reject);
  });
}

// --- Request handler (funciona tanto local como en Vercel) ---
const requestHandler = async (req, res) => {
  const url = req.url;
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- ZONES ---
  if (url === "/api/zones" && method === "GET") {
    sendJSON(res, 200, db.zones);
    return;
  }

  if (url === "/api/zones" && method === "POST") {
    try {
      const body = await readBody(req);
      const newZone = {
        id: db.zones.length > 0 ? Math.max(...db.zones.map(z => z.id)) + 1 : 1,
        name: body.name || "Nuevo mueble",
        type: body.type || "floorstand",
        x: body.x || 100,
        y: body.y || 100,
        w: body.w || 120,
        h: body.h || 100,
        color: body.color || "#3b82f6",
        floor: body.floor || 1,
      };
      db.zones.push(newZone);
      saveDB();
      sendJSON(res, 201, newZone);
    } catch (e) {
      sendJSON(res, 400, { error: "Datos inválidos" });
    }
    return;
  }

  const zoneMatch = url.match(/^\/api\/zones\/(\d+)$/);
  if (zoneMatch && method === "PUT") {
    const id = parseInt(zoneMatch[1]);
    try {
      const body = await readBody(req);
      const idx = db.zones.findIndex(z => z.id === id);
      if (idx === -1) {
        sendJSON(res, 404, { error: "Zona no encontrada" });
        return;
      }
      db.zones[idx] = { ...db.zones[idx], ...body, id };
      saveDB();
      sendJSON(res, 200, db.zones[idx]);
    } catch (e) {
      sendJSON(res, 400, { error: "Datos inválidos" });
    }
    return;
  }

  if (zoneMatch && method === "DELETE") {
    const id = parseInt(zoneMatch[1]);
    const idx = db.zones.findIndex(z => z.id === id);
    if (idx === -1) {
      sendJSON(res, 404, { error: "Zona no encontrada" });
      return;
    }
    db.products.forEach(p => { if (p.zone_id === id) p.zone_id = null; });
    db.zones.splice(idx, 1);
    saveDB();
    sendJSON(res, 200, { ok: true });
    return;
  }

  // --- PRODUCTS ---
  if (url === "/api/products" && method === "GET") {
    const results = db.products.map(p => {
      const z = db.zones.find(zone => zone.id === p.zone_id);
      return { ...p, zone_name: z ? z.name : null, zone_type: z ? z.type : null };
    });
    sendJSON(res, 200, results);
    return;
  }

  if (url.startsWith("/api/products/search") && method === "GET") {
    const q = (url.split("?q=")[1] || "").toLowerCase();
    const decoded = decodeURIComponent(q);
    const results = db.products.filter(p =>
      p.code.toLowerCase().includes(decoded) ||
      p.name.toLowerCase().includes(decoded) ||
      p.category.toLowerCase().includes(decoded)
    ).map(p => {
      const z = db.zones.find(zone => zone.id === p.zone_id);
      return { ...p, zone_name: z ? z.name : null, zone_type: z ? z.type : null };
    });
    sendJSON(res, 200, results);
    return;
  }

  const productMatch = url.match(/^\/api\/products\/([^\/]+)(\/zone)?$/);
  if (productMatch && method === "GET" && !productMatch[2]) {
    const code = productMatch[1];
    const p = db.products.find(prod => prod.code === code);
    if (!p) {
      sendJSON(res, 404, { error: "Producto no encontrado" });
      return;
    }
    const z = db.zones.find(zone => zone.id === p.zone_id);
    sendJSON(res, 200, { ...p, zone_name: z ? z.name : null, zone_type: z ? z.type : null });
    return;
  }

  // Crear producto nuevo
  if (url === "/api/products" && method === "POST") {
    try {
      const body = await readBody(req);
      if (!body.code) {
        sendJSON(res, 400, { error: "Falta el código" });
        return;
      }
      if (db.products.find(p => p.code === body.code)) {
        sendJSON(res, 409, { error: "Ya existe un producto con ese código" });
        return;
      }
      const newProduct = {
        id: db.products.length > 0 ? Math.max(...db.products.map(p => p.id)) + 1 : 1,
        code: body.code,
        name: body.name || "Producto sin nombre",
        category: body.category || "general",
        size: body.size || null,
        color: body.color || null,
        price: body.price || 0,
        zone_id: body.zone_id || null,
        shelf_position: body.shelf_position || null,
      };
      db.products.push(newProduct);
      saveDB();
      const z = db.zones.find(zone => zone.id === newProduct.zone_id);
      sendJSON(res, 201, { ...newProduct, zone_name: z ? z.name : null, zone_type: z ? z.type : null });
    } catch (e) {
      sendJSON(res, 400, { error: "Datos inválidos" });
    }
    return;
  }

  // Editar producto por código
  if (productMatch && method === "PUT" && !productMatch[2]) {
    const code = productMatch[1];
    try {
      const body = await readBody(req);
      const idx = db.products.findIndex(p => p.code === code);
      if (idx === -1) {
        sendJSON(res, 404, { error: "Producto no encontrado" });
        return;
      }
      db.products[idx] = { ...db.products[idx], ...body, code };
      saveDB();
      const z = db.zones.find(zone => zone.id === db.products[idx].zone_id);
      sendJSON(res, 200, { ...db.products[idx], zone_name: z ? z.name : null, zone_type: z ? z.type : null });
    } catch (e) {
      sendJSON(res, 400, { error: "Datos inválidos" });
    }
    return;
  }

  if (productMatch && method === "POST" && productMatch[2] === "/zone") {
    const code = productMatch[1];
    try {
      const body = await readBody(req);
      const idx = db.products.findIndex(p => p.code === code);
      if (idx === -1) {
        sendJSON(res, 404, { error: "Producto no encontrado" });
        return;
      }
      if (body.zone_id !== undefined) db.products[idx].zone_id = body.zone_id;
      if (body.shelf_position !== undefined) db.products[idx].shelf_position = body.shelf_position;
      saveDB();
      sendJSON(res, 200, { ok: true });
    } catch (e) {
      sendJSON(res, 400, { error: "Datos inválidos" });
    }
    return;
  }

  // --- SCANS ---
  if (url === "/api/scans" && method === "POST") {
    try {
      const body = await readBody(req);
      const scan = {
        id: db.scans.length > 0 ? Math.max(...db.scans.map(s => s.id)) + 1 : 1,
        product_code: body.product_code,
        scanned_at: new Date().toISOString(),
        device: body.device,
      };
      db.scans.push(scan);
      saveDB();
      sendJSON(res, 201, { ok: true, scanId: scan.id });
    } catch (e) {
      sendJSON(res, 400, { error: "Datos inválidos" });
    }
    return;
  }

  if (url === "/api/scans" && method === "GET") {
    const scans = [...db.scans].reverse().slice(0, 50);
    sendJSON(res, 200, scans);
    return;
  }

  // Ruta no encontrada
  sendJSON(res, 404, { error: "Ruta no encontrada" });
};

// Crear servidor
const server = http.createServer(requestHandler);

// Exportar para Vercel (serverless) y para uso local
module.exports = { server, requestHandler };

// Solo iniciar el servidor si se ejecuta directamente (no en Vercel)
if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
    console.log(`Base de datos: ${DB_FILE}`);
  });
}
