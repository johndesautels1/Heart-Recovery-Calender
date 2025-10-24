import VitalsSample from '../models/VitalsSample';

export const getLatestVitals = async (userId: string) => {
  return await VitalsSample.findOne({
    where: { userId },
    order: [['timestamp', 'DESC']]
  });
};