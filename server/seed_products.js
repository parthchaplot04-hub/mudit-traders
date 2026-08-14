const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://parthchaplot04_db_user:m5dXab%21MXNGXZqn@mudittraders.entkruc.mongodb.net/?appName=mudittraders";

const data = [
  // DRYFRUIT
  { category: "DRYFRUIT", productName: "Badam Giri (ALMOND KERNELS)", stock: 116.75, unit: "kg", rate: 828.60 },
  { category: "DRYFRUIT", productName: "CASHEW", stock: 74.5, unit: "kg", rate: 732.17 },
  { category: "DRYFRUIT", productName: "Coconut Powder", stock: 5, unit: "kg", rate: 1767.61 },
  { category: "DRYFRUIT", productName: "Dry Dates", stock: 30, unit: "kg", rate: 101.05 },
  { category: "DRYFRUIT", productName: "Figs", stock: 30, unit: "kg", rate: 505.15 },
  { category: "DRYFRUIT", productName: "GOLA/KHOPRA", stock: 270, unit: "kg", rate: 199.45 },
  { category: "DRYFRUIT", productName: "Gum Arabic", stock: 1.5, unit: "kg", rate: 224.73 },
  { category: "DRYFRUIT", productName: "Kaishmish Raisan", stock: 7, unit: "kg", rate: 261.38 },
  { category: "DRYFRUIT", productName: "Kaju", stock: 37.25, unit: "kg", rate: 770.57 },
  { category: "DRYFRUIT", productName: "Khajur", stock: 118.4, unit: "kg", rate: 178.93 },
  { category: "DRYFRUIT", productName: "Kishmish", stock: 70.98, unit: "kg", rate: 368.33 },
  { category: "DRYFRUIT", productName: "Kulth", stock: 25, unit: "kg", rate: 49.00 },
  { category: "DRYFRUIT", productName: "Magaj", stock: 16.5, unit: "kg", rate: 507.28 },
  { category: "DRYFRUIT", productName: "Nariyal", stock: 3, unit: "bag", rate: 1782.59 },
  { category: "DRYFRUIT", productName: "Pista", stock: 17.75, unit: "kg", rate: 1231.43 },
  { category: "DRYFRUIT", productName: "Saffron", stock: 100, unit: "g", rate: 234.56 },
  { category: "DRYFRUIT", productName: "South", stock: 10, unit: "kg", rate: 381.95 },
  { category: "DRYFRUIT", productName: "Supari", stock: 2, unit: "kg", rate: 475.96 },
  { category: "DRYFRUIT", productName: "Walnut", stock: 47, unit: "kg", rate: 785.46 },

  // GHEE
  { category: "GHEE", productName: "Pat Cow Ghee 1ltr", stock: 26, unit: "pcs", rate: 627.22 },
  { category: "GHEE", productName: "Pat Cow Ghee 500ml", stock: 4, unit: "pcs", rate: 341.36 },
  { category: "GHEE", productName: "Saras Ghee 15kg Tin", stock: 2, unit: "tin", rate: 8883.16 },
  { category: "GHEE", productName: "Saras Ghee 1ltr", stock: 144, unit: "L", rate: 512.69 },
  { category: "GHEE", productName: "Saras Ghee 500G", stock: 80, unit: "pcs", rate: 259.21 },
  { category: "GHEE", productName: "Saras Ghee 5ltr", stock: 20, unit: "L", rate: 519.05 },

  // KIRANA
  { category: "KIRANA", productName: "Bajra", stock: 60, unit: "kg", rate: 30.51 },
  { category: "KIRANA", productName: "Baking Powder", stock: 4, unit: "kg", rate: 124.32 },
  { category: "KIRANA", productName: "Besan", stock: 81, unit: "kg", rate: 73.49 },
  { category: "KIRANA", productName: "Boronyle Falke", stock: 6, unit: "kg", rate: 1049.06 },
  { category: "KIRANA", productName: "Chana Dal", stock: 21.55, unit: "kg", rate: 74.62 },
  { category: "KIRANA", productName: "Chana Sabat", stock: 30, unit: "kg", rate: 71.17 },
  { category: "KIRANA", productName: "Color", stock: 31, unit: "kg", rate: 207.03 },
  { category: "KIRANA", productName: "Crystal Sugar", stock: 100, unit: "kg", rate: 52.06 },
  { category: "KIRANA", productName: "Daawat Rice", stock: 6, unit: "kg", rate: 361.90 },
  { category: "KIRANA", productName: "Gulal", stock: 2, unit: "kg", rate: 239.73 },
  { category: "KIRANA", productName: "Imli", stock: 6, unit: "kg", rate: 124.04 },
  { category: "KIRANA", productName: "Jawar", stock: 60, unit: "kg", rate: 35.00 },
  { category: "KIRANA", productName: "Kabuli Chana", stock: 15, unit: "kg", rate: 95.00 },
  { category: "KIRANA", productName: "Kachari", stock: 0.5, unit: "kg", rate: 180.60 },
  { category: "KIRANA", productName: "Kala Namak 100g", stock: 50, unit: "pcs", rate: 5.40 },
  { category: "KIRANA", productName: "Kesari Color", stock: 10, unit: "pcs", rate: 67.20 },
  { category: "KIRANA", productName: "Kesari Powder", stock: 20, unit: "pcs", rate: 61.02 },
  { category: "KIRANA", productName: "Laxmi Baking Soda 100g", stock: 64, unit: "pcs", rate: 16.21 },
  { category: "KIRANA", productName: "Lemon Yellow", stock: 75, unit: "pcs", rate: 45.21 },
  { category: "KIRANA", productName: "Madhur 5kg", stock: 2, unit: "box", rate: 1186.51 },
  { category: "KIRANA", productName: "Maize Packing 5@", stock: 95, unit: "kg", rate: 83.52 },
  { category: "KIRANA", productName: "MAKHANA", stock: 21.5, unit: "kg", rate: 418.43 },
  { category: "KIRANA", productName: "Masoor Sabut", stock: 60, unit: "kg", rate: 71.14 },
  { category: "KIRANA", productName: "Masur Dal", stock: 78, unit: "kg", rate: 72.15 },
  { category: "KIRANA", productName: "Meetha Soda", stock: 48, unit: "kg", rate: 56.52 },
  { category: "KIRANA", productName: "Metanil Powder", stock: 90, unit: "pcs", rate: 42.42 },
  { category: "KIRANA", productName: "Milan Powder", stock: 5, unit: "kg", rate: 167.46 },
  { category: "KIRANA", productName: "Mishri", stock: 165, unit: "kg", rate: 54.02 },
  { category: "KIRANA", productName: "Misri Powder", stock: 97.5, unit: "kg", rate: 63.22 },
  { category: "KIRANA", productName: "Mitha Soda", stock: 60, unit: "kg", rate: 29.66 },
  { category: "KIRANA", productName: "Moong Sabut", stock: 150, unit: "kg", rate: 95.11 },
  { category: "KIRANA", productName: "Mukhwas", stock: 25, unit: "kg", rate: 106.26 },
  { category: "KIRANA", productName: "Multi Grain Aata", stock: 20, unit: "kg", rate: 55.24 },
  { category: "KIRANA", productName: "MUNG DAL", stock: 200.5, unit: "kg", rate: 90.68 },
  { category: "KIRANA", productName: "Mung Mogar", stock: 168.75, unit: "kg", rate: 97.68 },
  { category: "KIRANA", productName: "Orange Red", stock: 5, unit: "pcs", rate: 47.60 },
  { category: "KIRANA", productName: "Panchkuta", stock: 5, unit: "kg", rate: 400.00 },
  { category: "KIRANA", productName: "Peanut", stock: 10, unit: "kg", rate: 147.32 },
  { category: "KIRANA", productName: "Poha Packing", stock: 80, unit: "kg", rate: 48.08 },
  { category: "KIRANA", productName: "Poha Sukha", stock: 30, unit: "kg", rate: 46.28 },
  { category: "KIRANA", productName: "Ragi", stock: 30, unit: "kg", rate: 49.00 },
  { category: "KIRANA", productName: "Rajama", stock: 70, unit: "kg", rate: 104.35 },
  { category: "KIRANA", productName: "Rajgara", stock: 60, unit: "kg", rate: 93.63 },
  { category: "KIRANA", productName: "Rajgara @5%", stock: 36, unit: "kg", rate: 131.75 },
  { category: "KIRANA", productName: "Rice", stock: 62, unit: "kg", rate: 44.18 },
  { category: "KIRANA", productName: "Rice 351", stock: 63.5, unit: "kg", rate: 46.86 },
  { category: "KIRANA", productName: "Rice @5%", stock: 120, unit: "kg", rate: 53.86 },
  { category: "KIRANA", productName: "Rice India Gate", stock: 40, unit: "kg", rate: 115.18 },
  { category: "KIRANA", productName: "Sabudana", stock: 434, unit: "kg", rate: 54.46 },
  { category: "KIRANA", productName: "Sakhriya (Khanchana)", stock: 155, unit: "kg", rate: 47.10 },
  { category: "KIRANA", productName: "Salt 1kg", stock: 238, unit: "pcs", rate: 9.80 },
  { category: "KIRANA", productName: "Salt 2kg Bag", stock: 10, unit: "bag", rate: 746.77 },
  { category: "KIRANA", productName: "Salt 5 Kg Bag", stock: 2, unit: "bag", rate: 295.00 },
  { category: "KIRANA", productName: "Saltbag", stock: 30, unit: "bag", rate: 134.83 },
  { category: "KIRANA", productName: "SAMA", stock: 100, unit: "kg", rate: 71.47 },
  { category: "KIRANA", productName: "Sama Packing", stock: 9.5, unit: "kg", rate: 103.11 },
  { category: "KIRANA", productName: "Saraswati Camphor Slab 500g", stock: 6.28, unit: "kg", rate: 993.33 },
  { category: "KIRANA", productName: "SENDA NAMAK", stock: 25, unit: "kg", rate: 49.01 },
  { category: "KIRANA", productName: "Singada", stock: 45, unit: "kg", rate: 109.05 },
  { category: "KIRANA", productName: "Singdana Aata", stock: 2, unit: "kg", rate: 176.19 },
  { category: "KIRANA", productName: "Soda Ash", stock: 18, unit: "kg", rate: 28.25 },
  { category: "KIRANA", productName: "Soya Bari", stock: 1, unit: "box", rate: 1300.00 },
  { category: "KIRANA", productName: "Starches", stock: 100, unit: "kg", rate: 34.77 },
  { category: "KIRANA", productName: "Stone Flowers", stock: 6, unit: "kg", rate: 441.27 }
];

const productSchema = new mongoose.Schema({
  productCode: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  category: { type: String, required: true },
  stockUnit: { type: String, required: true },
  purchaseUnit: { type: String, required: true },
  salesUnit: { type: String, required: true },
  conversionFactor: { type: Number, required: true },
  sellingPricePaise: { type: Number, required: true },
  purchaseCostPaise: { type: Number, required: true },
  gstRate: { type: Number, required: true },
  currentStock: { type: Number, required: true },
  reorderLevel: { type: Number, required: true },
  reorderQuantity: { type: Number, required: true },
  active: { type: Boolean, default: true }
});

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB.");

    let count = 1;
    const docs = data.map(item => {
      const code = `${item.category.substring(0, 3).toUpperCase()}-${String(count++).padStart(3, '0')}`;
      return {
        productCode: code,
        productName: item.productName,
        category: item.category,
        stockUnit: item.unit,
        purchaseUnit: item.unit,
        salesUnit: item.unit,
        conversionFactor: 1,
        sellingPricePaise: Math.round(item.rate * 100),
        purchaseCostPaise: Math.round(item.rate * 100),
        gstRate: 0,
        currentStock: item.stock,
        reorderLevel: 0,
        reorderQuantity: 10
      };
    });

    const result = await Product.insertMany(docs);
    console.log(`Successfully inserted ${result.length} products.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
