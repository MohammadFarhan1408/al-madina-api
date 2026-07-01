import { v2 as cloudinary } from 'cloudinary';
import { config } from './index';
import { logger } from './logger';

if (config.cloudinary.enabled) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('✅ Cloudinary configured');
} else {
  logger.warn('⚠️  Cloudinary not configured — image uploads will be disabled');
}

export { cloudinary };
