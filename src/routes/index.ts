import { Router, Request, Response } from 'express';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { validateApiKey, validateJson, isValidUrl } from '../validation';
import { generateRandomFilename, ensureDirectoryExists } from '../utils';
import { videoQueue } from '../queue';
import config from '../config';
import logger from '../logger';
import { VideoRequest, VideoProcessingData, VideoResponse } from '../types';

const router = Router();

// Validate API key endpoint
router.get('/api/validate', validateApiKey(false), (req: Request, res: Response) => {
  res.json({ message: 'API key is valid' });
});

// Create video endpoint
router.post('/create-video', validateApiKey(true), async (req: Request, res: Response): Promise<void> => {
  try {
    const data: VideoRequest = req.body;
    const apiKey = (req as any).apiKey;

    // Validate JSON data
    const validation = validateJson(data);
    if (!validation.isValid) {
      res.status(400).json({ error: 'Invalid input data' });
      return;
    }

    const {
      record_id,
      input_url,
      framerate,
      duration,
      cache,
      zoom,
      crop,
      output_width,
      output_height,
      webhook_url
    } = data;

    // Additional validations
    if (!isValidUrl(input_url)) {
      res.status(400).json({ error: 'Invalid input URL' });
      return;
    }

    if (webhook_url && !isValidUrl(webhook_url)) {
      res.status(400).json({ error: 'Invalid webhook URL' });
      return;
    }

    // Download and validate input file
    let cachedInputFile: string;
    let inputWidth: number;
    let inputHeight: number;

    try {
      // Download the input file
      logger.info(`Downloading input file from: ${input_url}`);
      
      const response = await axios.get(input_url, {
        responseType: 'stream',
        timeout: 10000,
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
        headers: {
          'User-Agent': 'json2video-api/1.0'
        }
      });

      // Validate content type
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        res.status(400).json({ error: 'Invalid file type' });
        return;
      }

      // Ensure cache directory exists
      ensureDirectoryExists(config.cacheDir);

      // Generate cached file path
      cachedInputFile = path.join(config.cacheDir, generateRandomFilename());
      
      // Save the file
      const writer = fs.createWriteStream(cachedInputFile);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      logger.info(`Input file cached at: ${cachedInputFile}`);

      // Get video dimensions using ffprobe
      const ffprobeCommand = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        cachedInputFile
      ];

      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const process = spawn('ffprobe', ffprobeCommand.slice(1));
        
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
            try {
              const result = JSON.parse(stdout);
              const stream = result.streams[0];
              resolve({
                width: stream.width,
                height: stream.height
              });
            } catch (parseError) {
              reject(new Error(`Failed to parse ffprobe output: ${parseError}`));
            }
          } else {
            logger.error(`ffprobe error: ${stderr}`);
            reject(new Error(`ffprobe failed with error: ${stderr}`));
          }
        });

        process.on('error', (error) => {
          reject(error);
        });
      });

      inputWidth = dimensions.width;
      inputHeight = dimensions.height;

    } catch (error) {
      logger.error('Failed to download or process input file:', error);
      res.status(400).json({ error: 'Failed to download input file' });
      return;
    }

    // Ensure movies directory exists
    ensureDirectoryExists(config.moviesDir);

    // Generate output file path
    const filename = generateRandomFilename();
    const outputFile = path.join(config.moviesDir, filename);

    // Prepare data for queue processing
    const processingData: VideoProcessingData = {
      ...data,
      input_width: inputWidth,
      input_height: inputHeight,
      request_host: req.get('host') || 'localhost',
      cached_input_file: cachedInputFile,
      output_file: outputFile
    };

    // Add job to queue
    await videoQueue.add('createVideo', processingData, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    // Prepare response
    const responsePayload: VideoResponse = {
      record_id,
      filename,
      message: 'Video processing started',
      input_height: inputHeight,
      input_width: inputWidth,
      output_height,
      output_width
    };

    logger.info(`Video processing job queued for record_id: ${record_id}`);
    res.json(responsePayload);

  } catch (error) {
    logger.error('Error in create-video endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
