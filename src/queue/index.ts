import Queue from 'bull';
import { spawn } from 'child_process';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import logger from '../logger';
import { VideoProcessingData, WebhookPayload } from '../types';

// Create a Bull queue for video processing
export const videoQueue = new Queue('video processing', config.redis.url);

// Process video creation jobs
videoQueue.process('createVideo', async (job) => {
  const data: VideoProcessingData = job.data;
  logger.info(`Processing video job for record_id: ${data.record_id}`);

  try {
    await createVideoTask(data);
    logger.info(`Video processing completed for record_id: ${data.record_id}`);
    return { success: true, message: 'Video created successfully' };
  } catch (error) {
    logger.error(`Video processing failed for record_id: ${data.record_id}`, error);
    throw error;
  }
});

async function createVideoTask(data: VideoProcessingData): Promise<void> {
  const {
    record_id,
    framerate,
    duration,
    zoom,
    crop,
    input_width,
    input_height,
    output_width,
    output_height,
    webhook_url,
    cached_input_file,
    output_file,
    request_host
  } = data;

  // Validate input dimensions
  if (input_width <= 0 || input_height <= 0 || output_width <= 0 || output_height <= 0) {
    throw new Error('Input and output dimensions must be positive integers');
  }

  logger.info(`Duration param: ${duration}`);

  // Build FFmpeg filters
  let cropFilter = '';
  if (crop && (input_width !== output_width || input_height !== output_height)) {
    const cropWidth = Math.min(input_width, output_width);
    const cropHeight = Math.min(input_height, output_height);
    const cropX = Math.floor((input_width - cropWidth) / 2);
    const cropY = Math.floor((input_height - cropHeight) / 2);
    cropFilter = `,crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`;
  }

  let padFilter = '';
  if (!crop && (input_width !== output_width || input_height !== output_height)) {
    padFilter = `,scale=w=min(${output_width}/iw\\,${output_height}/ih)*iw:h=-2,scale=${output_width}:${output_height}:force_original_aspect_ratio=decrease,pad=${output_width}:${output_height}:(ow-iw)/2:(oh-ih)/2`;
  }

  let zoomFilter = '';
  if (zoom !== 0) {
    const maxZoomRate = 0.1;
    const normalizedZoom = (zoom / 100) * maxZoomRate;
    if (zoom > 0) {
      zoomFilter = `,zoompan=z='min(zoom+${normalizedZoom},2)':d=1`;
    } else {
      zoomFilter = `,zoompan=z='max(zoom-${Math.abs(normalizedZoom)},1)':d=1`;
    }
  }

  // Build FFmpeg command
  const ffmpegCommand = [
    'ffmpeg',
    '-loop', '1',
    '-i', cached_input_file,
    '-vf', `format=yuv420p${cropFilter}${padFilter},scale=${output_width}:${output_height}`,
    '-t', duration.toString(),
    '-pix_fmt', 'yuv420p',
    '-r', framerate.toString(),
    output_file
  ];

  logger.info(`Running FFmpeg command: ${ffmpegCommand.join(' ')}`);

  // Execute FFmpeg command
  await new Promise<void>((resolve, reject) => {
    const process = spawn('ffmpeg', ffmpegCommand.slice(1));
    
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        logger.info(`FFmpeg output: ${stdout}`);
        logger.info(`Processing video: ${cached_input_file} to ${output_file} completed successfully.`);
        resolve();
      } else {
        logger.error(`FFmpeg error: ${stderr}`);
        reject(new Error(`FFmpeg failed with exit code ${code}: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      logger.error('FFmpeg process error:', error);
      reject(error);
    });
  });

  logger.info(`Video created at ${output_file}`);

  // Call webhook if provided
  if (webhook_url) {
    const baseUrl = `${config.scheme}://${request_host}:${config.publicPort}`;
    const fullUrl = `${baseUrl}/${output_file}`;

    const webhookPayload: WebhookPayload = {
      record_id,
      filename: fullUrl
    };

    try {
      const response = await axios.post(webhook_url, webhookPayload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      logger.info(`Webhook called successfully with payload: ${JSON.stringify(webhookPayload)}`);
    } catch (error) {
      logger.error('Webhook call failed:', error);
      throw new Error('Webhook call failed');
    }
  }

  // Clean up cached input file
  try {
    if (fs.existsSync(cached_input_file)) {
      fs.unlinkSync(cached_input_file);
      logger.info(`Cleaned up cached input file: ${cached_input_file}`);
    }
  } catch (error) {
    logger.warn(`Failed to clean up cached input file: ${cached_input_file}`, error);
  }
}

// Queue event handlers
videoQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed with result:`, result);
});

videoQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

videoQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

export default videoQueue;
