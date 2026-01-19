import { ImageSourcePropType } from 'react-native';

// Map normalized crop keys to local asset requires
const cropMap: Record<string, ImageSourcePropType> = {
  wheat: require('../../assets/wheat.avif'),
  rice: require('../../assets/rice.avif'),
  maize: require('../../assets/maize.avif'),
  banana: require('../../assets/banana.avif'),
  coffee: require('../../assets/coffee.avif'),
  eggplant: require('../../assets/eggplant.avif'),
  snakegourd: require('../../assets/snake_gourd.avif'),
  snake_gourd: require('../../assets/snake_gourd.avif'),
  bittergourd: require('../../assets/bitter_gourd.avif'),
  bitter_gourd: require('../../assets/bitter_gourd.avif'),
  ashgourd: require('../../assets/ash_gourd.avif'),
  ash_gourd: require('../../assets/ash_gourd.avif'),
};

export const getCropIcon = (cropName?: string): ImageSourcePropType | null => {
  if (!cropName) return null;
  const key = cropName.toLowerCase().replace(/\s+/g, '').replace(/[-_]/g, '');
  // try direct key
  if (cropMap[key]) return cropMap[key];
  // try with underscores
  const alt = cropName.toLowerCase().replace(/\s+/g, '_');
  if (cropMap[alt]) return cropMap[alt];
  return null;
};

export default getCropIcon;
