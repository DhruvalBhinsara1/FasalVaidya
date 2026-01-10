/**
 * Product Data for FasalVaidya
 * ============================
 * Curated fertilizer products for nutrient deficiencies
 * Source: latest "recommended products.csv" provided by user
 */

import { Product } from '../components/ProductCard';

// Image placeholder used where product images were not provided in the CSV
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=800&q=80';

export const PRODUCT_DATA: Product[] = [
  // === NITROGEN (N) PRODUCTS ===
  {
    id: 'n-gogarden-urea-46',
    name: 'GoGarden Urea 46% Nitrogen Fertilizer',
    name_hi: 'गो गार्डन यूरिया 46% नाइट्रोजन उर्वरक',
    description: 'High-nitrogen (46%) water-soluble fertilizer for rapid green growth',
    description_hi: 'तेज़ हरियाली वृद्धि के लिए 46% नाइट्रोजन वाला पानी में घुलनशील उर्वरक',
    price: '₹149',
    rating: 4.5,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://gogarden.co.in/products/urea-fertilizers-for-plants-46-nitrogen-fertilizer-soil-application-and-100-water-soluble-1',
    nutrient: 'N',
    brand: 'GoGarden',
  },
  {
    id: 'n-iffco-fish-meal',
    name: 'IFFCO Fish Meal Bio Nitrogen Fertilizer',
    name_hi: 'IFFCO फिश मील बायो नाइट्रोजन उर्वरक',
    description: 'Organic fish-meal based nitrogen to build soil vitality',
    description_hi: 'मिट्टी की उर्वरता बढ़ाने वाला ऑर्गेनिक फिश मील नाइट्रोजन',
    price: '₹299',
    rating: 4.4,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://iffcourbangardens.com/products/fish-meal-bio-nitrogen-fertilizer?variant=49656676155680&country=IN&currency=INR',
    nutrient: 'N',
    brand: 'IFFCO Urban Gardens',
  },
  {
    id: 'n-adi-shankara-flowering',
    name: 'Adi Shankara Nitrogen Fertilizer (Flowering)',
    name_hi: 'आदि शंकरा नाइट्रोजन उर्वरक (फूलों के लिए)',
    description: 'Nitrogen boost to support vigorous foliage and flowering',
    description_hi: 'घनी पत्तियों और पुष्पन के लिए नाइट्रोजन बढ़ावा',
    price: '₹208',
    rating: 4.3,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://www.amazon.in/Adi-Shankara-Nitrogen-Fertilizer-Flowering/dp/B0F6KKTZD1',
    nutrient: 'N',
    brand: 'Adi Shankara',
  },

  // === PHOSPHORUS (P) PRODUCTS ===
  {
    id: 'p-ugaoo-bone-meal',
    name: 'Ugaoo Bone Meal (5 kg)',
    name_hi: 'उगाओ बोन मील (5 किग्रा)',
    description: 'Organic phosphorus source for strong roots and flowering',
    description_hi: 'मजबूत जड़ों और फूलों के लिए जैविक फॉस्फोरस स्रोत',
    price: '₹399',
    rating: 4.5,
    image: FALLBACK_IMAGE,
    buyUrl: 'https://www.ugaoo.com/products/ugaoo-bone-meal-5-kg',
    nutrient: 'P',
    brand: 'Ugaoo',
  },
  {
    id: 'p-rock-phosphate-anandi',
    name: 'Rock Phosphate Natural Phosphorus Fertilizer',
    name_hi: 'रॉक फॉस्फेट प्राकृतिक फॉस्फोरस उर्वरक',
    description: 'Slow-release rock phosphate to build resilient root systems',
    description_hi: 'सशक्त जड़ प्रणाली के लिए धीमी गति से जारी रॉक फॉस्फेट',
    price: '₹220',
    rating: 4.2,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://anandigreens.com/collections/fertilisers/products/premium-quality-rock-phosphate-natural-phosphorus-fertilizer?_pos=19&_fid=b826ed33f&_ss=c&variant=51481524142369',
    nutrient: 'P',
    brand: 'Anandi Greens',
  },
  {
    id: 'p-instagrow-12-61-00',
    name: 'Instagrow NPK 12-61-00 (High P)',
    name_hi: 'इंस्टाग्रो NPK 12-61-00 (उच्च फॉस्फोरस)',
    description: 'Water-soluble 12-61-00 for quick phosphorus correction',
    description_hi: 'तेज़ फॉस्फोरस सुधार के लिए 12-61-00 पानी में घुलनशील उर्वरक',
    price: '₹249',
    rating: 4.3,
    image: FALLBACK_IMAGE,
    buyUrl: 'https://www.ugaoo.com/products/instagrow-npk-12-61-00-fertilizer',
    nutrient: 'P',
    brand: 'Ugaoo',
  },

  // === POTASSIUM (K) PRODUCTS ===
  {
    id: 'k-instagrow-13-00-45',
    name: 'Instagrow NPK 13-00-45 (High K)',
    name_hi: 'इंस्टाग्रो NPK 13-00-45 (उच्च पोटेशियम)',
    description: 'High-potassium 13-00-45 for fruiting and stress tolerance',
    description_hi: 'फलन और तनाव सहनशीलता के लिए उच्च पोटेशियम 13-00-45',
    price: '₹249',
    rating: 4.4,
    image: FALLBACK_IMAGE,
    buyUrl: 'https://www.ugaoo.com/products/instagrow-npk-13-00-45-fertilizer',
    nutrient: 'K',
    brand: 'Ugaoo',
  },
  {
    id: 'k-calong-calcium-edta',
    name: 'Utkarsh Calong Calcium 10% EDTA',
    name_hi: 'उत्कर्ष कैलॉन्ग कैल्शियम 10% EDTA',
    description: 'Chelated Ca10 EDTA to strengthen cell walls and prevent rot',
    description_hi: 'कोशिका भित्ति मजबूत करने और सड़न रोकने के लिए केलेटेड Ca10 EDTA',
    price: '₹590',
    rating: 4.2,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://utkarshagro.com/products/utkarsh-calong-calcium-ca-10-edta-chelated-100-water-soluble-foliar-spray-edta-chelated-fertilizers?variant=45082001572153&country=IN&currency=INR&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic&utm_source=google&utm_medium=cpc&utm_campaign=VM_Pmax_Asset_Humic_Acid_Aug%2724&gad_source=1&gad_campaignid=23304150460&gbraid=0AAAAABtLO7Oz81Ng6KNhaVzGgO5hv0JUg&gclid=CjwKCAiAjojLBhAlEiwAcjhrDgD2wzbMEUlqfHeJBF4niIxflAcPIUeGueoykjYiVCPOVMua8yQ9bBoC2hMQAvD_BwE',
    nutrient: 'K',
    brand: 'Utkarsh',
  },
  {
    id: 'k-iffco-potash-meal',
    name: 'IFFCO Potash Meal Bio Potash Granules',
    name_hi: 'IFFCO पोटाश मील बायो पोटाश ग्रैन्यूल्स',
    description: 'Slow-release potash granules for sturdy stems and disease resistance',
    description_hi: 'मजबूत तनों और रोग प्रतिरोध के लिए धीमी गति से जारी पोटाश ग्रैन्यूल्स',
    price: '₹599',
    rating: 4.3,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://iffcourbangardens.com/products/potash-meal-bio-potash-fertilizer-slow-release-granules',
    nutrient: 'K',
    brand: 'IFFCO Urban Gardens',
  },
  {
    id: 'k-iffco-gypsum-meal',
    name: 'IFFCO Gypsum Meal (Calcium & Sulfur)',
    name_hi: 'IFFCO जिप्सम मील (कैल्शियम और सल्फर)',
    description: 'Gypsum to improve soil structure and reduce salinity stress',
    description_hi: 'मिट्टी की संरचना सुधारने और लवणता तनाव घटाने के लिए जिप्सम',
    price: '₹199',
    rating: 4.1,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://iffcourbangardens.com/products/gypsum-meal?variant=46922444865824&country=IN&currency=INR&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic&utm_source=googleads&utm_medium=Pmax&utm_campaign=EN_Pmax_All+Products_NCA%2B_04%2F04%2F24&gad_source=1&gad_campaignid=21147733176&gbraid=0AAAAAoVjDS9UQ6dw_lO-GMx8VZylbjyIy&gclid=CjwKCAiAjojLBhAlEiwAcjhrDgtexayf5KvvrNWhKqXLyQZCh4VCK7dZ98NpiJlEsu0TSmFL3T9v5BoCiXIQAvD_BwE',
    nutrient: 'K',
    brand: 'IFFCO Urban Gardens',
  },
  {
    id: 'k-erwon-pk-fertilizer',
    name: 'Erwon Potassium-Phosphorus Fertilizer',
    name_hi: 'एरवोन पोटेशियम-फॉस्फोरस उर्वरक',
    description: 'PK blend to support flowering and fruit quality',
    description_hi: 'फूल और फल की गुणवत्ता के लिए PK मिश्रण',
    price: '₹155',
    rating: 4.2,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://www.amazon.in/Potassium-Phosphorus-Fertilizer-Erwon-Fungicide/dp/B097GTP9TY',
    nutrient: 'K',
    brand: 'Erwon',
  },
  {
    id: 'k-katyayani-calcium-edta',
    name: 'Katyayani Calcium 10% EDTA',
    name_hi: 'कात्यायनी कैल्शियम 10% EDTA',
    description: 'Calcium EDTA to correct calcium-related disorders and support fruit set',
    description_hi: 'कैल्शियम संबंधी कमी व फल सेट सुधारने के लिए कैल्शियम EDTA',
    price: '₹455',
    rating: 4.1,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://katyayanikrishidirect.com/products/calcium-10-edta?variant=45291406754088&country=IN&currency=INR&utm_medium=product_sync&utm_source=google&utm_content=sag_organic&utm_campaign=sag_organic&https://katyayanikrishidirect.com/?utm_source=Google_Paid&utm_medium=CPC&utm_campaign=P_max_June_Fungicide&utm_id=Adsset_FERTLISER&utm_source=Google+Ads&gad_source=1&gad_campaignid=22701921499&gbraid=0AAAAAp-1zrhbRxaZYX6a46h8NZtfHGa7p&gclid=CjwKCAiAjojLBhAlEiwAcjhrDlcKnS7Ibrggj3SiIudekOEz24oph0aLnoD39GzrQNACxqgybNKYoRoCrIQQAvD_BwE',
    nutrient: 'K',
    brand: 'Katyayani',
  },
  {
    id: 'k-amazon-b0dp2xw959',
    name: 'Specialty NPK Fertilizer (Amazon)',
    name_hi: 'स्पेशलिटी NPK उर्वरक (अमेज़न)',
    description: 'Water-soluble mixed nutrient fertilizer for targeted correction',
    description_hi: 'लक्षित सुधार के लिए पानी में घुलनशील मिश्रित पोषक उर्वरक',
    price: '₹649',
    rating: 4.0,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://www.amazon.in/gp/aw/d/B0DP2XW959/?_encoding=UTF8&pd_rd_plhdr=t&aaxitk=26d9407bba6f3b89f83cacedfed1d2bf&hsa_cr_id=0&qid=1768052028&sr=1-1-e0fa1fdd-d857-4087-adda-5bd576b25987&aref=d0BBxsxwf9&ref_=sbx_s_sparkle_sbtcd_asin_0_img&pd_rd_w=1lHvP&content-id=amzn1.sym.6dfd6df7-44a2-4792-8c83-3ac8a4ba533a%3Aamzn1.sym.6dfd6df7-44a2-4792-8c83-3ac8a4ba533a&pf_rd_p=6dfd6df7-44a2-4792-8c83-3ac8a4ba533a&pf_rd_r=8NKTDD3YHB9F2ESTAH5B&pd_rd_wg=DGXsC&pd_rd_r=50a36874-73ab-462f-b869-790d99c4f7d6&th=1',
    nutrient: 'K',
    brand: 'Amazon',
  },

  // === MULTI-NUTRIENT PRODUCTS (deduped by shared IDs) ===
  {
    id: 'multi-casadeamor-19-19-19',
    name: 'Casa De Amor NPK 19-19-19 (All Purpose)',
    name_hi: 'कासा डे अमोर NPK 19-19-19 (सर्व-उद्देश्य)',
    description: 'Balanced 19-19-19 for overall nutrition; suitable for any major deficiency',
    description_hi: 'संतुलित 19-19-19 सर्वांगीण पोषण, किसी भी मुख्य कमी के लिए उपयुक्त',
    price: '₹199',
    rating: 4.4,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://casadeamor.in/products/npk-19-19-19-fertilizer-for-plants-and-gardening-all-purpose-plant-food-400-gm?variant=44985697730757&country=IN&currency=INR&cmp_id=23359343502&adg_id=&kwd=&device=m&gad_campaignid=23368487986',
    nutrient: 'N', // also exposed for P and K below
    brand: 'Casa De Amor',
  },
  {
    id: 'multi-casadeamor-19-19-19',
    name: 'Casa De Amor NPK 19-19-19 (All Purpose)',
    name_hi: 'कासा डे अमोर NPK 19-19-19 (सर्व-उद्देश्य)',
    description: 'Balanced 19-19-19 for overall nutrition; suitable for any major deficiency',
    description_hi: 'संतुलित 19-19-19 सर्वांगीण पोषण, किसी भी मुख्य कमी के लिए उपयुक्त',
    price: '₹149',
    rating: 4.4,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://casadeamor.in/products/npk-19-19-19-fertilizer-for-plants-and-gardening-all-purpose-plant-food-400-gm?variant=44985697730757&country=IN&currency=INR&cmp_id=23359343502&adg_id=&kwd=&device=m&gad_campaignid=23368487986',
    nutrient: 'P',
    brand: 'Casa De Amor',
  },
  {
    id: 'multi-casadeamor-19-19-19',
    name: 'Casa De Amor NPK 19-19-19 (All Purpose)',
    name_hi: 'कासा डे अमोर NPK 19-19-19 (सर्व-उद्देश्य)',
    description: 'Balanced 19-19-19 for overall nutrition; suitable for any major deficiency',
    description_hi: 'संतुलित 19-19-19 सर्वांगीण पोषण, किसी भी मुख्य कमी के लिए उपयुक्त',
    price: '₹—',
    rating: 4.4,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://casadeamor.in/products/npk-19-19-19-fertilizer-for-plants-and-gardening-all-purpose-plant-food-400-gm?variant=44985697730757&country=IN&currency=INR&cmp_id=23359343502&adg_id=&kwd=&device=m&gad_campaignid=23368487986',
    nutrient: 'K',
    brand: 'Casa De Amor',
  },
  {
    id: 'multi-bombaygreens-flowers',
    name: 'Bombay Greens All Flowers Organic Fertilizer',
    name_hi: 'बॉम्बे ग्रीन्स ऑल फ्लावर्स ऑर्गेनिक उर्वरक',
    description: 'Organic all-purpose feed tailored for flowering plants',
    description_hi: 'फूलदार पौधों के लिए उपयुक्त ऑर्गेनिक सर्व-उद्देश्य खाद',
    price: '₹299',
    rating: 4.3,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://www.bombaygreens.com/products/all-flowers-organic-fertilizer?variant=44196862034223&country=IN&currency=INR',
    nutrient: 'N',
    brand: 'Bombay Greens',
  },
  {
    id: 'multi-bombaygreens-flowers',
    name: 'Bombay Greens All Flowers Organic Fertilizer',
    name_hi: 'बॉम्बे ग्रीन्स ऑल फ्लावर्स ऑर्गेनिक उर्वरक',
    description: 'Organic all-purpose feed tailored for flowering plants',
    description_hi: 'फूलदार पौधों के लिए उपयुक्त ऑर्गेनिक सर्व-उद्देश्य खाद',
    price: '₹—',
    rating: 4.3,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://www.bombaygreens.com/products/all-flowers-organic-fertilizer?variant=44196862034223&country=IN&currency=INR',
    nutrient: 'P',
    brand: 'Bombay Greens',
  },
  {
    id: 'multi-bombaygreens-flowers',
    name: 'Bombay Greens All Flowers Organic Fertilizer',
    name_hi: 'बॉम्बे ग्रीन्स ऑल फ्लावर्स ऑर्गेनिक उर्वरक',
    description: 'Organic all-purpose feed tailored for flowering plants',
    description_hi: 'फूलदार पौधों के लिए उपयुक्त ऑर्गेनिक सर्व-उद्देश्य खाद',
    price: '₹—',
    rating: 4.3,
    image: FALLBACK_IMAGE,
    buyUrl:
      'https://www.bombaygreens.com/products/all-flowers-organic-fertilizer?variant=44196862034223&country=IN&currency=INR',
    nutrient: 'K',
    brand: 'Bombay Greens',
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
