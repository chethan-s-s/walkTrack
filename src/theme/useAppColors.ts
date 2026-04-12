import { useColorScheme } from 'react-native';

import { getAppColors } from './palette';

export const useAppColors = () => {
  const scheme = useColorScheme();
  return getAppColors(scheme);
};
