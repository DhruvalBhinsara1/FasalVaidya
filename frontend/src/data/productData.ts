/**
 * Product Data for FasalVaidya
 * ============================
 * Curated fertilizer products for nutrient deficiencies
 * Products from Amazon India with affiliate links
 */

import { Product } from '../components/ProductCard';

// Amazon India product links provided by user
export const PRODUCT_DATA: Product[] = [
  // === NITROGEN (N) PRODUCTS ===
  {
    id: 'n-iffco-slow-release',
    name: 'IFFCO Slow-release Nitrogen Fertilizer',
    name_hi: 'IFFCO धीमी गति से जारी नाइट्रोजन उर्वरक',
    description: 'Premium slow-release nitrogen for sustained plant growth and leaf development',
    description_hi: 'निरंतर पौधों की वृद्धि और पत्ती विकास के लिए प्रीमियम धीमी गति से जारी नाइट्रोजन',
    price: '₹299',
    rating: 4.2,
    image: 'https://m.media-amazon.com/images/I/61BQr4a6URL._SL1500_.jpg',
    buyUrl: 'https://www.amazon.in/IFFCO-Urban-Gardens-Slow-release-Development/dp/B0DP2XDP8K/',
    nutrient: 'N',
    brand: 'IFFCO',
  },
  {
    id: 'n-urea-fertilizer',
    name: 'Urea Fertilizer - High Nitrogen Content',
    name_hi: 'यूरिया उर्वरक - उच्च नाइट्रोजन',
    description: 'Fast-acting nitrogen source for quick greening and vegetative growth',
    description_hi: 'तेजी से हरियाली और वनस्पति विकास के लिए तेजी से काम करने वाला नाइट्रोजन स्रोत',
    price: '₹199',
    rating: 4.0,
    image: 'https://m.media-amazon.com/images/I/71PJBmJoN7L._SL1500_.jpg',
    buyUrl: 'https://www.amazon.in/dp/B08KFQP8C7/',
    nutrient: 'N',
    brand: 'Generic',
  },

  // === PHOSPHORUS (P) PRODUCTS ===
  {
    id: 'p-iffco-phosphorus',
    name: 'IFFCO Phosphorus Fertilizer',
    name_hi: 'IFFCO फॉस्फोरस उर्वरक',
    description: 'Essential phosphorus for root development and flower/fruit formation',
    description_hi: 'जड़ विकास और फूल/फल निर्माण के लिए आवश्यक फॉस्फोरस',
    price: '₹349',
    rating: 4.3,
    image: 'https://m.media-amazon.com/images/I/61HSByww-pL._SL1500_.jpg',
    buyUrl: 'https://www.amazon.in/IFFCO-Urban-Gardens-Phosphorus-Development/dp/B0CF59DZLY/',
    nutrient: 'P',
    brand: 'IFFCO',
  },
  {
    id: 'p-bone-meal',
    name: 'Organic Bone Meal - Natural Phosphorus',
    name_hi: 'जैविक अस्थि चूर्ण - प्राकृतिक फॉस्फोरस',
    description: 'Natural slow-release phosphorus from organic bone meal',
    description_hi: 'जैविक अस्थि चूर्ण से प्राकृतिक धीमी गति से जारी फॉस्फोरस',
    price: '₹249',
    rating: 4.1,
    image: 'https://m.media-amazon.com/images/I/71YrF3oFE8L._SL1500_.jpg',
    buyUrl: 'https://www.amazon.in/dp/B07WPJN5HM/',
    nutrient: 'P',
    brand: 'TrustBasket',
  },

  // === POTASSIUM (K) PRODUCTS ===
  {
    id: 'k-npk-19-19-19',
    name: 'Go Garden NPK 19-19-19 Balanced Fertilizer',
    name_hi: 'गो गार्डन NPK 19-19-19 संतुलित उर्वरक',
    description: 'Balanced NPK formula for overall plant health and fruit quality',
    description_hi: 'समग्र पौधों के स्वास्थ्य और फल गुणवत्ता के लिए संतुलित NPK फॉर्मूला',
    price: '₹399',
    rating: 4.4,
    image: 'https://m.media-amazon.com/images/I/71VLnLvB6TL._SL1500_.jpg',
    buyUrl: 'https://www.amazon.in/Go-Garden-19-Fertilizer-Gardening/dp/B0C5JWLJ8P/',
    nutrient: 'K',
    brand: 'Go Garden',
  },
  {
    id: 'k-potash-mop',
    name: 'Muriate of Potash (MOP) - Potassium',
    name_hi: 'म्यूरिएट ऑफ पोटाश (MOP) - पोटेशियम',
    description: 'High potassium content for stronger stems and disease resistance',
    description_hi: 'मजबूत तनों और रोग प्रतिरोधक क्षमता के लिए उच्च पोटेशियम',
    price: '₹279',
    rating: 4.2,
    image: 'https://m.media-amazon.com/images/I/61rC5jvn9rL._SL1000_.jpg',
    buyUrl: 'https://www.amazon.in/dp/B09NNJM5XM/',
    nutrient: 'K',
    brand: 'Shiviproducts',
  },

  // === MAGNESIUM (Mg) PRODUCTS ===
  {
    id: 'mg-epsom-salt',
    name: 'Epsom Salt - Magnesium Sulfate',
    name_hi: 'एप्सम सॉल्ट - मैग्नीशियम सल्फेट',
    description: 'Pure magnesium sulfate for chlorophyll production and leaf health',
    description_hi: 'क्लोरोफिल उत्पादन और पत्ती स्वास्थ्य के लिए शुद्ध मैग्नीशियम सल्फेट',
    price: '₹199',
    rating: 4.5,
    image: 'https://m.media-amazon.com/images/I/71mMFgSJdYL._SL1500_.jpg',
    buyUrl: 'https://www.amazon.in/dp/B0716SMYTW/',
    nutrient: 'Mg',
    brand: 'TrustBasket',
  },
  {
    id: 'mg-dolomite-lime',
    name: 'Dolomite Lime - Calcium & Magnesium',
    name_hi: 'डोलोमाइट चूना - कैल्शियम और मैग्नीशियम',
    description: 'Natural source of magnesium and calcium, also adjusts soil pH',
    description_hi: 'मैग्नीशियम और कैल्शियम का प्राकृतिक स्रोत, मिट्टी के pH को भी समायोजित करता है',
    price: '₹229',
    rating: 4.3,
    image: 'https://m.media-amazon.com/images/I/61J5YqNLu0L._SL1100_.jpg',
    buyUrl: 'https://www.amazon.in/dp/B08L5Y9NGK/',
    nutrient: 'Mg',
    brand: 'Ugaoo',
  },

  // === MULTI-NUTRIENT PRODUCTS ===
  {
    id: 'multi-seaweed',
    name: 'Seaweed Extract - Complete Nutrition',
    name_hi: 'समुद्री शैवाल अर्क - संपूर्ण पोषण',
    description: 'Organic seaweed extract with all essential micro and macro nutrients',
    description_hi: 'सभी आवश्यक सूक्ष्म और स्थूल पोषक तत्वों के साथ जैविक समुद्री शैवाल अर्क',
    price: '₹349',
    rating: 4.4,
    image: 'https://m.media-amazon.com/images/I/61Rx2kJjMwL._SL1100_.jpg',
    buyUrl: 'https://www.amazon.in/dp/B07PHPQNCP/',
    nutrient: 'N', // Primary benefit
    brand: 'Shiviproducts',
  },
];

/**
 * Get products for a specific nutrient deficiency
 */
export const getProductsForNutrient = (nutrient: 'N' | 'P' | 'K' | 'Mg'): Product[] => {
  return PRODUCT_DATA.filter((product) => product.nutrient === nutrient);
};

/**
 * Get products for multiple nutrient deficiencies
 */
export const getProductsForDeficiencies = (
  deficiencies: { nutrient: 'N' | 'P' | 'K' | 'Mg'; severity: string }[]
): Product[] => {
  // API uses 'attention' and 'critical' for severity levels
  const severeDeficiencies = deficiencies
    .filter((d) => d.severity === 'attention' || d.severity === 'critical')
    .map((d) => d.nutrient);

  if (severeDeficiencies.length === 0) {
    return [];
  }

  // Get products for each deficient nutrient
  const products: Product[] = [];
  const addedIds = new Set<string>();

  severeDeficiencies.forEach((nutrient) => {
    const nutrientProducts = getProductsForNutrient(nutrient);
    nutrientProducts.forEach((product) => {
      if (!addedIds.has(product.id)) {
        products.push(product);
        addedIds.add(product.id);
      }
    });
  });

  // Sort by rating (highest first)
  return products.sort((a, b) => b.rating - a.rating);
};

/**
 * Get top recommended product for a nutrient
 */
export const getTopProductForNutrient = (nutrient: 'N' | 'P' | 'K' | 'Mg'): Product | null => {
  const products = getProductsForNutrient(nutrient);
  if (products.length === 0) return null;
  return products.sort((a, b) => b.rating - a.rating)[0];
};

export default PRODUCT_DATA;
