export interface VideoRequest {
  record_id: string;
  input_url: string;
  webhook_url?: string;
  framerate: number;
  duration: number;
  cache: boolean;
  zoom: number;
  crop: boolean;
  output_width: number;
  output_height: number;
}

export interface VideoProcessingData extends VideoRequest {
  input_width: number;
  input_height: number;
  request_host: string;
  cached_input_file: string;
  output_file: string;
}

export interface VideoResponse {
  record_id: string;
  filename: string;
  message: string;
  input_height: number;
  input_width: number;
  output_height: number;
  output_width: number;
}

export interface WebhookPayload {
  record_id: string;
  filename: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
